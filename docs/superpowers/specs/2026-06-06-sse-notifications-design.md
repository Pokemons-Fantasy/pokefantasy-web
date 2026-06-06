# SSE Notificaciones en Tiempo Real — PokeFantasy

## Contexto

`useNotificationPoller` lanza peticiones HTTP cada 30 s contra `/activity` (una por liga) y `/my-pending-trades` para detectar robos y propuestas de trade nuevas. En una liga de 8 personas con ~5 ligas cada uno eso son 6+ peticiones por usuario por minuto. Con Render free tier el backend ya va justo. El objetivo es reemplazarlo por SSE push, bajando la latencia a <1 s y eliminando el polling continuo.

## Decisiones de diseño

### Autenticación del SSE
`EventSource` no soporta headers custom — el JWT no puede ir en `Authorization`. Solución: `GET /v1/users/events?token=xxx`. El endpoint se declara público en `SecurityConfig` (mismo patrón que `/draft/events`) y el controller valida el token manualmente via `TokenPort.extractUsername` + `TokenPort.isTokenValid`. Riesgo mínimo en una app de amigos sin logs públicos. Cuando se migre a httpOnly cookie el token en URL desaparecerá de forma natural.

### Canal SSE por usuario (no por liga)
`UserSseEmitterRegistry` keyed por `username`. Un usuario puede tener múltiples tabs/pestañas abiertas — el registry mantiene una lista de emitters por usuario y envía a todos. El `SseEmitterRegistry` existente (por liga, para draft) no cambia.

### Dispatch del robo — retorno de `StealPokemonCommandHandler`
El `StealController` recibe solo `targetPokemonName` en el request body — no sabe quién es la víctima hasta que el handler busca el `DraftPick`. Solución: cambiar el tipo de retorno de `StealPokemonCommandHandler` de `Void` a `String` (devuelve `victimUsername`). Misma cadena: handler → facade → controller → SSE dispatch. No hay nueva dependencia de módulo.

Para el trade el controller ya tiene `request.getResponder()` — no requiere cambio de retorno.

### Payload SSE
Eventos nombrados con datos JSON mínimos:
- `steal`: `{"leagueId":"x","actorUsername":"ash","pokemonName":"charizard"}`
- `trade-proposed`: `{"leagueId":"x","proposer":"ash"}`

El frontend parsea el JSON y muestra el toast directamente sin refetch.

### Fallback polling
Si el `EventSource` entra en error (red, reconexión fallida), el hook activa un `setInterval` de 120 s con la lógica de polling existente como red de seguridad. El SSE se intenta reconectar con backoff nativo del browser.

### Deduplicación
Se mantienen `seenTradeIds` y `seenStealIds` (`Set<string>` en refs). La pasada de init popula los sets sin toastar. Los eventos SSE también pasan por los sets antes de mostrar toast (protección contra reconexiones que reenvíen eventos).

## Archivos

### Backend (`C:\PokeFantasy\pokefantasy\src`)

| Archivo | Acción |
|---------|--------|
| `api-rest/.../UserSseEmitterRegistry.java` | CREAR — registry keyed por username |
| `api-rest/.../UserController.java` | MODIFICAR — añadir `GET /v1/users/events?token=xxx` |
| `infrastructure/.../security/SecurityConfig.java` | MODIFICAR — añadir `/v1/users/events` a public paths |
| `api-rest/.../StealController.java` | MODIFICAR — inyectar registry, llamar `sendToUser` con victim retornado |
| `api-rest/.../TradeController.java` | MODIFICAR — inyectar registry, llamar `sendToUser` con `request.getResponder()` |
| `application/.../commands/steal/StealPokemonCommandHandler.java` | MODIFICAR — retorno `Void` → `String` (victimUsername) |
| `application/.../commands/steal/StealFacade.java` | MODIFICAR — `steal()` retorno `void` → `String` |
| `application/.../commands/steal/StealPokemonCommandHandlerTest.java` | MODIFICAR — actualizar asserts para retorno String |
| `application/.../commands/trade/ProposeTradeCommandHandler.java` | MODIFICAR — retorno `Void` → `String` (tradeId) |
| `application/.../commands/trade/TradeFacade.java` | MODIFICAR — `propose()` retorno `void` → `String` |
| `application/.../commands/trade/ProposeTradeCommandHandlerTest.java` | MODIFICAR — actualizar asserts para retorno String |

### Frontend (`C:\PokeFantasy\pokefantasy-web\src`)

| Archivo | Acción |
|---------|--------|
| `hooks/useNotificationPoller.ts` → `hooks/useNotificationSse.ts` | RENOMBRAR + REESCRIBIR |
| `App.tsx` | MODIFICAR — cambiar import `useNotificationPoller` → `useNotificationSse` |

## Implementación detallada

### `UserSseEmitterRegistry`

```java
@Component
public class UserSseEmitterRegistry {
    private final Map<String, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public SseEmitter register(String username) {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.computeIfAbsent(username, k -> new CopyOnWriteArrayList<>()).add(emitter);
        Runnable cleanup = () -> {
            List<SseEmitter> list = emitters.get(username);
            if (list != null) list.remove(emitter);
        };
        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(e -> cleanup.run());
        return emitter;
    }

    public void sendToUser(String username, String eventName, String data) {
        List<SseEmitter> list = emitters.getOrDefault(username, Collections.emptyList());
        List<SseEmitter> dead = new ArrayList<>();
        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(data));
            } catch (IOException | IllegalStateException e) {
                dead.add(emitter);
            }
        }
        list.removeAll(dead);
    }

    @Scheduled(fixedRate = 30_000)
    public void heartbeat() {
        emitters.forEach((username, list) -> {
            List<SseEmitter> dead = new ArrayList<>();
            for (SseEmitter emitter : list) {
                try {
                    emitter.send(SseEmitter.event().comment("ping"));
                } catch (IOException | IllegalStateException e) {
                    dead.add(emitter);
                }
            }
            list.removeAll(dead);
        });
    }
}
```

### `UserController` — nuevo endpoint

```java
@GetMapping("/events")
public SseEmitter streamUserEvents(@RequestParam String token) {
    String username = tokenPort.extractUsername(token);
    if (username == null || !tokenPort.isTokenValid(token, username)) {
        throw new IllegalArgumentException("Token inválido");
    }
    return userSseRegistry.register(username);
}
```

`UserController` ya inyecta `TokenPort` (lo usa en login). `userSseRegistry` se añade al constructor.

### `SecurityConfig` — public path

```java
("GET".equals(request.getMethod()) && request.getServletPath().endsWith("/draft/events")) ||
("GET".equals(request.getMethod()) && "/v1/users/events".equals(request.getServletPath()))
```

### `StealPokemonCommandHandler` — cambio de retorno

```java
// Antes
public class StealPokemonCommandHandler implements CommandHandler<StealPokemonCommand, Void> {
    public Void handle(StealPokemonCommand command) { ...; return null; }
    public Class<StealPokemonCommand> commandType() { ... }
}

// Después
public class StealPokemonCommandHandler implements CommandHandler<StealPokemonCommand, String> {
    public String handle(StealPokemonCommand command) { ...; return victim; }
    public Class<StealPokemonCommand> commandType() { ... }
}
```

`victim` ya se calcula en línea 92 del handler actual (`String victim = targetPick.getUsername()`).

### `StealFacade`

```java
// Antes
public void steal(String leagueId, String username, String targetPokemonName) throws Exception {
    mediator.send(new StealPokemonCommand(leagueId, username, targetPokemonName));
}

// Después
public String steal(String leagueId, String username, String targetPokemonName) throws Exception {
    return mediator.send(new StealPokemonCommand(leagueId, username, targetPokemonName));
}
```

### `StealController` — dispatch SSE

```java
@PostMapping("/steal")
public ResponseEntity<Void> steal(@PathVariable String leagueId,
                                   @AuthenticationPrincipal UserDetails userDetails,
                                   @RequestBody StealPokemonRequest request) throws Exception {
    String victim = stealFacade.steal(leagueId, userDetails.getUsername(), request.getTargetPokemonName());
    String payload = String.format(
        "{\"leagueId\":\"%s\",\"actorUsername\":\"%s\",\"pokemonName\":\"%s\"}",
        leagueId, userDetails.getUsername(), request.getTargetPokemonName());
    userSseRegistry.sendToUser(victim, "steal", payload);
    return ResponseEntity.ok().build();
}
```

### `ProposeTradeCommandHandler` — cambio de retorno

```java
// Antes
public class ProposeTradeCommandHandler implements CommandHandler<ProposeTradeCommand, Void> {
    public Void handle(ProposeTradeCommand command) { ...; tradeRepository.save(trade); return null; }
}

// Después
public class ProposeTradeCommandHandler implements CommandHandler<ProposeTradeCommand, String> {
    public String handle(ProposeTradeCommand command) { ...; tradeRepository.save(trade); return trade.getId(); }
}
```

`trade.getId()` ya está disponible después del `tradeRepository.save(trade)` (MongoDB asigna el `_id` al salvar).

### `TradeFacade`

```java
// Antes
public void propose(String leagueId, String proposer, String responder,
                    String proposerPokemon, String responderPokemon, int coins) throws Exception {
    mediator.send(new ProposeTradeCommand(...));
}

// Después
public String propose(String leagueId, String proposer, String responder,
                      String proposerPokemon, String responderPokemon, int coins) throws Exception {
    return mediator.send(new ProposeTradeCommand(...));
}
```

### `TradeController` — dispatch SSE en `propose`

```java
@PostMapping("/trades")
public ResponseEntity<Void> propose(...) throws Exception {
    int coins = request.getCoinsOffered() != null ? request.getCoinsOffered() : 0;
    String tradeId = tradeFacade.propose(leagueId, userDetails.getUsername(), request.getResponder(),
            request.getProposerPokemonName(), request.getResponderPokemonName(), coins);
    String payload = String.format(
        "{\"leagueId\":\"%s\",\"proposer\":\"%s\",\"tradeId\":\"%s\"}",
        leagueId, userDetails.getUsername(), tradeId);
    userSseRegistry.sendToUser(request.getResponder(), "trade-proposed", payload);
    return ResponseEntity.ok().build();
}
```

### `useNotificationSse.ts` — frontend

```typescript
export function useNotificationSse() {
  const username = useAuthStore((s) => s.username);
  const token = useAuthStore((s) => s.token);
  const addToast = useToastStore((s) => s.addToast);
  const queryClient = useQueryClient();
  const seenTradeIds = useRef<Set<string>>(new Set());
  const seenStealIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!username || !token) return;

    // --- Init: poblar refs sin toastar ---
    async function initRefs() {
      const trades = await queryClient.fetchQuery({
        queryKey: ['my-pending-trades'],
        queryFn: getMyPendingTrades,
        staleTime: 25_000,
      });
      trades.forEach((t) => seenTradeIds.current.add(t.id));

      const leagues = await queryClient.fetchQuery({
        queryKey: ['my-leagues'],
        queryFn: getMyLeagues,
        staleTime: 55_000,
      });
      for (const league of leagues) {
        const feed = await queryClient.fetchQuery({
          queryKey: ['activity-feed-poll', league.id],
          queryFn: () => getActivityFeed(league.id, 0),
          staleTime: 25_000,
        });
        feed.events
          .filter((e) => e.type === 'STEAL' && e.targetUsername === username)
          .forEach((e) => seenStealIds.current.add(e.id));
      }
    }

    let fallbackInterval: ReturnType<typeof setInterval> | null = null;

    // --- SSE ---
    const apiBase = import.meta.env.VITE_API_URL ?? '';
    const es = new EventSource(`${apiBase}/v1/users/events?token=${token}`);

    es.addEventListener('steal', (e) => {
      const data = JSON.parse(e.data) as { leagueId: string; actorUsername: string; pokemonName: string };
      if (!seenStealIds.current.has(e.lastEventId || data.pokemonName + data.actorUsername)) {
        seenStealIds.current.add(e.lastEventId || data.pokemonName + data.actorUsername);
        addToast('info', `🔥 ${data.actorUsername} te robó a ${data.pokemonName}`,
          `/leagues/${data.leagueId}/activity`);
        queryClient.invalidateQueries({ queryKey: ['activity-feed-poll', data.leagueId] });
      }
    });

    es.addEventListener('trade-proposed', (e) => {
      const data = JSON.parse(e.data) as { leagueId: string; proposer: string; tradeId: string };
      if (!seenTradeIds.current.has(data.tradeId)) {
        seenTradeIds.current.add(data.tradeId);
        addToast('info', `🔔 Nueva propuesta de intercambio de ${data.proposer}`,
          `/leagues/${data.leagueId}/activity`);
        queryClient.invalidateQueries({ queryKey: ['my-pending-trades'] });
      }
    });

    es.onerror = () => {
      // SSE caído — activar fallback polling a 120s
      if (!fallbackInterval) {
        fallbackInterval = setInterval(async () => {
          const trades = await queryClient.fetchQuery({
            queryKey: ['my-pending-trades'],
            queryFn: getMyPendingTrades,
            staleTime: 25_000,
          });
          for (const trade of trades) {
            if (!seenTradeIds.current.has(trade.id)) {
              seenTradeIds.current.add(trade.id);
              addToast('info', `🔔 Nueva propuesta de intercambio de ${trade.proposer}`,
                `/leagues/${trade.leagueId}/activity`);
            }
          }
        }, 120_000);
      }
    };

    es.onopen = () => {
      // SSE reconectado — parar fallback
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
        fallbackInterval = null;
      }
    };

    initRefs();

    return () => {
      es.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [username, token, queryClient, addToast]);
}
```

**Deduplicación:** Robos usan `event.id` del activity feed (inmutable). Trades usan `tradeId` incluido en el payload SSE — devuelto por `ProposeTradeCommandHandler` tras el save (MongoDB asigna `_id` al persistir). Ambos refs sobreviven reconexiones SSE.

## Verificación

1. `./mvnw -B -ntp clean verify` — BUILD SUCCESS (tests de StealPokemonCommandHandlerTest actualizados)
2. Usuario A roba a usuario B → en <1 s aparece toast en sesión de B
3. Usuario A propone trade a usuario B → en <1 s aparece toast en sesión de B
4. Cerrar la conexión SSE manualmente (devtools → Network → Cancel) → fallback polling activo a 120 s
5. Reconectar → fallback se detiene
6. `tsc --noEmit` sin errores
