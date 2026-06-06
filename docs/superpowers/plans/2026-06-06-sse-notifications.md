# SSE Notificaciones en Tiempo Real Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el polling HTTP de 30 s por SSE push para notificar robos y trades en tiempo real (<1 s de latencia).

**Architecture:** Nuevo `UserSseEmitterRegistry` keyed por `username` en `api-rest`. `StealPokemonCommandHandler` y `ProposeTradeCommandHandler` cambian su retorno de `Void` a `String` (victimUsername / tradeId) para que los controladores puedan hacer dispatch SSE sin query extra. El frontend reemplaza `useNotificationPoller` (setInterval 30 s) por `useNotificationSse` (EventSource con fallback polling 120 s).

**Tech Stack:** Spring SSE (`SseEmitter`), `@Scheduled` heartbeat, `TokenPort` para validar JWT en query param, React `EventSource` API, TanStack Query `invalidateQueries`.

---

### Task 1: `UserSseEmitterRegistry`

**Files:**
- Create: `src/api-rest/src/main/java/com/villu/pokefantasy/UserSseEmitterRegistry.java`

- [ ] **Step 1: Crear el componente**

```java
package com.villu.pokefantasy;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class UserSseEmitterRegistry {

    // username → emitters activos (puede haber múltiples tabs)
    private final Map<String, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public SseEmitter register(String username) {
        SseEmitter emitter = new SseEmitter(0L); // sin timeout — heartbeat lo mantiene vivo
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

    /** Heartbeat cada 30 s para evitar que el proxy de Render cierre conexiones idle */
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

- [ ] **Step 2: Compilar módulo api-rest**

```bash
cd C:\PokeFantasy\pokefantasy
./mvnw -B -ntp clean package -DskipTests -pl api-rest -am
```

Esperado: BUILD SUCCESS

- [ ] **Step 3: Commit**

```powershell
cd C:\PokeFantasy\pokefantasy
git checkout -b feature/sse-notifications
git add src/api-rest/src/main/java/com/villu/pokefantasy/UserSseEmitterRegistry.java
$msg = @'
feat: add UserSseEmitterRegistry keyed by username
'@
git commit -m $msg
```

---

### Task 2: `StealPokemonCommandHandler` retorna `victimUsername`

**Files:**
- Modify: `src/application/src/main/java/com/villu/pokefantasy/commands/steal/StealPokemonCommandHandler.java`
- Test: `src/application/src/test/java/com/villu/pokefantasy/commands/steal/StealPokemonCommandHandlerTest.java`

El handler actualmente `implements CommandHandler<StealPokemonCommand, Void>` y hace `return null`. Se cambia a `String` devolviendo `victim` (ya calculado en línea 92 del archivo actual).

- [ ] **Step 1: Actualizar test happy path para capturar el retorno**

En `StealPokemonCommandHandlerTest.java`, localizar `handle_happyPath_transfersPokemonAndCoins` (línea ~81) y cambiar la línea que llama al handler:

```java
// Antes (línea ~103):
handler.handle(new StealPokemonCommand(LEAGUE_ID, STEALER, TARGET));

// Después:
String result = handler.handle(new StealPokemonCommand(LEAGUE_ID, STEALER, TARGET));
```

Añadir al final del método de test (antes del cierre `}`):
```java
assertThat(result).isEqualTo(VICTIM);
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

```bash
./mvnw -B -ntp test -pl application -am -Dtest=StealPokemonCommandHandlerTest#handle_happyPath_transfersPokemonAndCoins
```

Esperado: FAIL — error de compilación porque `handler.handle(...)` devuelve `Void` y no se puede asignar a `String`.

- [ ] **Step 3: Cambiar el handler**

En `StealPokemonCommandHandler.java`, hacer tres cambios:

1. Línea de clase (`implements`):
```java
// Antes:
public class StealPokemonCommandHandler implements CommandHandler<StealPokemonCommand, Void> {
// Después:
public class StealPokemonCommandHandler implements CommandHandler<StealPokemonCommand, String> {
```

2. Firma del método `handle`:
```java
// Antes:
public Void handle(StealPokemonCommand command) {
// Después:
public String handle(StealPokemonCommand command) {
```

3. La última línea del método `handle` (antes de los métodos privados):
```java
// Antes:
        return null;
    }

    private LeagueMember getMember(...)
// Después:
        return victim;
    }

    private LeagueMember getMember(...)
```

- [ ] **Step 4: Ejecutar todos los tests del handler**

```bash
./mvnw -B -ntp test -pl application -am -Dtest=StealPokemonCommandHandlerTest
```

Esperado: todos PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/application/src/main/java/com/villu/pokefantasy/commands/steal/StealPokemonCommandHandler.java
git add src/application/src/test/java/com/villu/pokefantasy/commands/steal/StealPokemonCommandHandlerTest.java
$msg = @'
refactor: StealPokemonCommandHandler returns victimUsername instead of Void
'@
git commit -m $msg
```

---

### Task 3: `StealFacade` retorna `String`

**Files:**
- Modify: `src/application/src/main/java/com/villu/pokefantasy/commands/steal/StealFacade.java`

- [ ] **Step 1: Cambiar el método `steal`**

```java
// Antes:
public void steal(String leagueId, String stealer, String targetPokemonName) throws Exception {
    mediator.send(new StealPokemonCommand(leagueId, stealer, targetPokemonName));
}

// Después:
public String steal(String leagueId, String stealer, String targetPokemonName) throws Exception {
    return mediator.send(new StealPokemonCommand(leagueId, stealer, targetPokemonName));
}
```

El resto del archivo no cambia (`setStealPrice` sigue siendo `void`).

- [ ] **Step 2: Compilar**

```bash
./mvnw -B -ntp clean package -DskipTests -pl application -am
```

Esperado: BUILD SUCCESS

- [ ] **Step 3: Commit**

```powershell
git add src/application/src/main/java/com/villu/pokefantasy/commands/steal/StealFacade.java
$msg = @'
refactor: StealFacade.steal() returns victimUsername
'@
git commit -m $msg
```

---

### Task 4: `ProposeTradeCommandHandler` retorna `tradeId`

**Files:**
- Modify: `src/application/src/main/java/com/villu/pokefantasy/commands/trade/ProposeTradeCommandHandler.java`
- Test: `src/application/src/test/java/com/villu/pokefantasy/commands/trade/ProposeTradeCommandHandlerTest.java`

`TradeRepository.save(TradeEntity)` devuelve `TradeEntity` (con el `id` asignado por MongoDB tras la persistencia). El handler usa el valor de retorno para obtener el `id`.

- [ ] **Step 1: Actualizar test happy path**

En `ProposeTradeCommandHandlerTest.java`, localizar `handle_validProposal_savesPendingTrade` (línea ~58). Añadir el mock de `save` para que asigne un `id`, y capturar el retorno del handler:

```java
// Añadir antes de handler.handle(...):
when(tradeRepository.save(any())).thenAnswer(inv -> {
    TradeEntity t = inv.getArgument(0);
    t.setId("trade-123");
    return t;
});

// Cambiar la llamada al handler:
// Antes:
handler.handle(new ProposeTradeCommand("l1", "ash", "brock", "pikachu", "onix", 150));
// Después:
String tradeId = handler.handle(new ProposeTradeCommand("l1", "ash", "brock", "pikachu", "onix", 150));
```

Añadir al final del método:
```java
assertThat(tradeId).isEqualTo("trade-123");
```

También actualizar cualquier otro test que use `ArgumentCaptor` con `tradeRepository.save` para que el mock devuelva la entidad en lugar de `null` — buscar `verify(tradeRepository).save(captor.capture())` y, si el test falla por NPE, añadir `when(tradeRepository.save(any())).thenReturn(new TradeEntity())`.

- [ ] **Step 2: Verificar que el test falla por compilación**

```bash
./mvnw -B -ntp test -pl application -am -Dtest=ProposeTradeCommandHandlerTest#handle_validProposal_savesPendingTrade
```

Esperado: FAIL — `handle(...)` devuelve `Void`, no `String`.

- [ ] **Step 3: Cambiar el handler**

Tres cambios en `ProposeTradeCommandHandler.java`:

1. Clase:
```java
// Antes:
public class ProposeTradeCommandHandler implements CommandHandler<ProposeTradeCommand, Void> {
// Después:
public class ProposeTradeCommandHandler implements CommandHandler<ProposeTradeCommand, String> {
```

2. Firma del método:
```java
// Antes:
public Void handle(ProposeTradeCommand command) {
// Después:
public String handle(ProposeTradeCommand command) {
```

3. Cambiar `tradeRepository.save(trade)` (actualmente ignora el retorno) y el `return null` final:
```java
// Antes:
        tradeRepository.save(trade);
        UserEntity responderUser = userRepository.findByUsername(responder);
        if (responderUser != null && !responderUser.getFcmTokens().isEmpty()) {
            pushNotificationPort.send(
                    responderUser.getFcmTokens(),
                    "Trade propuesto",
                    proposer + " quiere intercambiar " + trade.getProposerPokemonName()
                            + " por tu " + trade.getResponderPokemonName());
        }
        return null;

// Después:
        TradeEntity saved = tradeRepository.save(trade);
        UserEntity responderUser = userRepository.findByUsername(responder);
        if (responderUser != null && !responderUser.getFcmTokens().isEmpty()) {
            pushNotificationPort.send(
                    responderUser.getFcmTokens(),
                    "Trade propuesto",
                    proposer + " quiere intercambiar " + trade.getProposerPokemonName()
                            + " por tu " + trade.getResponderPokemonName());
        }
        return saved.getId();
```

- [ ] **Step 4: Ejecutar todos los tests del handler**

```bash
./mvnw -B -ntp test -pl application -am -Dtest=ProposeTradeCommandHandlerTest
```

Esperado: todos PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/application/src/main/java/com/villu/pokefantasy/commands/trade/ProposeTradeCommandHandler.java
git add src/application/src/test/java/com/villu/pokefantasy/commands/trade/ProposeTradeCommandHandlerTest.java
$msg = @'
refactor: ProposeTradeCommandHandler returns tradeId instead of Void
'@
git commit -m $msg
```

---

### Task 5: `TradeFacade` retorna `String`

**Files:**
- Modify: `src/application/src/main/java/com/villu/pokefantasy/commands/trade/TradeFacade.java`

- [ ] **Step 1: Cambiar el método `propose`**

```java
// Antes:
public void propose(String leagueId, String proposer, String responder,
                     String proposerPokemonName, String responderPokemonName,
                     int coinsOffered) throws Exception {
    mediator.send(new ProposeTradeCommand(leagueId, proposer, responder,
            proposerPokemonName, responderPokemonName, coinsOffered));
}

// Después:
public String propose(String leagueId, String proposer, String responder,
                      String proposerPokemonName, String responderPokemonName,
                      int coinsOffered) throws Exception {
    return mediator.send(new ProposeTradeCommand(leagueId, proposer, responder,
            proposerPokemonName, responderPokemonName, coinsOffered));
}
```

- [ ] **Step 2: Compilar**

```bash
./mvnw -B -ntp clean package -DskipTests -pl application -am
```

Esperado: BUILD SUCCESS

- [ ] **Step 3: Commit**

```powershell
git add src/application/src/main/java/com/villu/pokefantasy/commands/trade/TradeFacade.java
$msg = @'
refactor: TradeFacade.propose() returns tradeId
'@
git commit -m $msg
```

---

### Task 6: Endpoint SSE `GET /v1/users/events` + SecurityConfig

**Files:**
- Modify: `src/api-rest/src/main/java/com/villu/pokefantasy/UserController.java`
- Modify: `src/infrastructure/src/main/java/com/villu/pokefantasy/security/SecurityConfig.java`

- [ ] **Step 1: Añadir public path en `SecurityConfig`**

Localizar el `RequestMatcher publicPaths` (líneas 39–41) y ampliar la condición:

```java
// Antes:
RequestMatcher publicPaths = request ->
        PUBLIC_PATHS.contains(request.getServletPath()) ||
        ("GET".equals(request.getMethod()) && request.getServletPath().endsWith("/draft/events"));

// Después:
RequestMatcher publicPaths = request ->
        PUBLIC_PATHS.contains(request.getServletPath()) ||
        ("GET".equals(request.getMethod()) && request.getServletPath().endsWith("/draft/events")) ||
        ("GET".equals(request.getMethod()) && "/v1/users/events".equals(request.getServletPath()));
```

- [ ] **Step 2: Añadir endpoint en `UserController`**

Añadir imports nuevos al inicio del archivo (junto a los existentes):

```java
import com.villu.pokefantasy.ports.TokenPort;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
```

Añadir `UserSseEmitterRegistry` y `TokenPort` al constructor:

```java
// Antes:
private final UserFacade userFacade;

public UserController(UserFacade userFacade) {
    this.userFacade = userFacade;
}

// Después:
private final UserFacade userFacade;
private final UserSseEmitterRegistry userSseRegistry;
private final TokenPort tokenPort;

public UserController(UserFacade userFacade,
                      UserSseEmitterRegistry userSseRegistry,
                      TokenPort tokenPort) {
    this.userFacade = userFacade;
    this.userSseRegistry = userSseRegistry;
    this.tokenPort = tokenPort;
}
```

Añadir el endpoint al final de la clase (antes del cierre `}`):

```java
@GetMapping("/users/events")
public SseEmitter streamUserEvents(@RequestParam String token) {
    String username = tokenPort.extractUsername(token);
    if (username == null || !tokenPort.isTokenValid(token, username)) {
        throw new IllegalArgumentException("Token inválido");
    }
    return userSseRegistry.register(username);
}
```

- [ ] **Step 3: Compilar todo**

```bash
./mvnw -B -ntp clean package -DskipTests
```

Esperado: BUILD SUCCESS

- [ ] **Step 4: Commit**

```powershell
git add src/infrastructure/src/main/java/com/villu/pokefantasy/security/SecurityConfig.java
git add src/api-rest/src/main/java/com/villu/pokefantasy/UserController.java
$msg = @'
feat: add GET /v1/users/events SSE endpoint with token auth
'@
git commit -m $msg
```

---

### Task 7: Dispatch SSE desde `StealController` y `TradeController`

**Files:**
- Modify: `src/api-rest/src/main/java/com/villu/pokefantasy/StealController.java`
- Modify: `src/api-rest/src/main/java/com/villu/pokefantasy/TradeController.java`

- [ ] **Step 1: Actualizar `StealController`**

Añadir import:
```java
import com.villu.pokefantasy.UserSseEmitterRegistry;
```

Añadir campo y constructor:
```java
// Antes:
private final StealFacade stealFacade;

public StealController(StealFacade stealFacade) {
    this.stealFacade = stealFacade;
}

// Después:
private final StealFacade stealFacade;
private final UserSseEmitterRegistry userSseRegistry;

public StealController(StealFacade stealFacade, UserSseEmitterRegistry userSseRegistry) {
    this.stealFacade = stealFacade;
    this.userSseRegistry = userSseRegistry;
}
```

Actualizar el endpoint `steal`:
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

El método `setStealPrice` no cambia.

- [ ] **Step 2: Actualizar `TradeController`**

Añadir import:
```java
import com.villu.pokefantasy.UserSseEmitterRegistry;
```

Añadir campo y constructor:
```java
// Antes:
private final TradeFacade tradeFacade;

public TradeController(TradeFacade tradeFacade) {
    this.tradeFacade = tradeFacade;
}

// Después:
private final TradeFacade tradeFacade;
private final UserSseEmitterRegistry userSseRegistry;

public TradeController(TradeFacade tradeFacade, UserSseEmitterRegistry userSseRegistry) {
    this.tradeFacade = tradeFacade;
    this.userSseRegistry = userSseRegistry;
}
```

Actualizar solo el endpoint `propose` (los otros 3 endpoints no cambian):
```java
@PostMapping("/trades")
public ResponseEntity<Void> propose(@PathVariable String leagueId,
                                     @AuthenticationPrincipal UserDetails userDetails,
                                     @RequestBody ProposeTradeRequest request) throws Exception {
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

- [ ] **Step 3: Build completo con tests**

```bash
./mvnw -B -ntp clean verify
```

Esperado: BUILD SUCCESS, todos los tests PASS.

- [ ] **Step 4: Commit**

```powershell
git add src/api-rest/src/main/java/com/villu/pokefantasy/StealController.java
git add src/api-rest/src/main/java/com/villu/pokefantasy/TradeController.java
$msg = @'
feat: dispatch SSE notifications from StealController and TradeController
'@
git commit -m $msg
```

- [ ] **Step 5: Push y PR backend**

```powershell
cd C:\PokeFantasy\pokefantasy
git push -u origin feature/sse-notifications
```

Crear PR via GitHub API (backend → `develop`):
```powershell
. $PROFILE
$h = @{ Authorization = "Bearer $env:GITHUB_TOKEN"; Accept = "application/vnd.github+json" }
$body = "SSE notificaciones en tiempo real. UserSseEmitterRegistry por username. Robo y trade dispatch desde controladores."
$pr = [ordered]@{ title = "feat: SSE notificaciones tiempo real (robos y trades)"; head = "feature/sse-notifications"; base = "develop"; body = $body } | ConvertTo-Json
Invoke-RestMethod "https://api.github.com/repos/Pokemons-Fantasy/pokefantasy/pulls" -Method Post -Headers $h -Body $pr -ContentType "application/json; charset=utf-8"
```

---

### Task 8: Frontend — `useNotificationSse.ts`

**Files:**
- Create: `src/hooks/useNotificationSse.ts`
- Delete: `src/hooks/useNotificationPoller.ts` (se reemplaza)

- [ ] **Step 1: Crear `useNotificationSse.ts`**

Crear `src/hooks/useNotificationSse.ts` con el siguiente contenido:

```typescript
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { getMyPendingTrades } from '../api/trades';
import { getMyLeagues } from '../api/leagues';
import { getActivityFeed } from '../api/activity';

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://pokefantasy.onrender.com';

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
    const es = new EventSource(`${API_BASE}/v1/users/events?token=${token}`);

    es.addEventListener('steal', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as {
        leagueId: string;
        actorUsername: string;
        pokemonName: string;
      };
      const key = e.lastEventId || `${data.actorUsername}-${data.pokemonName}-${data.leagueId}`;
      if (!seenStealIds.current.has(key)) {
        seenStealIds.current.add(key);
        addToast(
          'info',
          `🔥 ${data.actorUsername} te robó a ${data.pokemonName}`,
          `/leagues/${data.leagueId}/activity`,
        );
        queryClient.invalidateQueries({ queryKey: ['activity-feed-poll', data.leagueId] });
        queryClient.invalidateQueries({ queryKey: ['draft-status', data.leagueId] });
      }
    });

    es.addEventListener('trade-proposed', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as {
        leagueId: string;
        proposer: string;
        tradeId: string;
      };
      if (!seenTradeIds.current.has(data.tradeId)) {
        seenTradeIds.current.add(data.tradeId);
        addToast(
          'info',
          `🔔 Nueva propuesta de intercambio de ${data.proposer}`,
          `/leagues/${data.leagueId}/activity`,
        );
        queryClient.invalidateQueries({ queryKey: ['my-pending-trades'] });
      }
    });

    es.onerror = () => {
      // SSE caído — activar fallback polling a 120 s
      if (!fallbackInterval) {
        fallbackInterval = setInterval(async () => {
          try {
            const trades = await queryClient.fetchQuery({
              queryKey: ['my-pending-trades'],
              queryFn: getMyPendingTrades,
              staleTime: 25_000,
            });
            for (const trade of trades) {
              if (!seenTradeIds.current.has(trade.id)) {
                seenTradeIds.current.add(trade.id);
                addToast(
                  'info',
                  `🔔 Nueva propuesta de intercambio de ${trade.proposer}`,
                  `/leagues/${trade.leagueId}/activity`,
                );
              }
            }
          } catch (_) {
            // red no disponible — reintentar en el próximo tick
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

- [ ] **Step 2: Eliminar el archivo antiguo**

```powershell
cd C:\PokeFantasy\pokefantasy-web
Remove-Item src/hooks/useNotificationPoller.ts
```

---

### Task 9: Frontend — `App.tsx` + TypeScript check + PR

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Actualizar import en `App.tsx`**

```typescript
// Antes:
import { useNotificationPoller } from './hooks/useNotificationPoller';

// Después:
import { useNotificationSse } from './hooks/useNotificationSse';
```

Actualizar `GlobalNotifications`:
```typescript
// Antes:
function GlobalNotifications() {
  useNotificationPoller();
  return null;
}

// Después:
function GlobalNotifications() {
  useNotificationSse();
  return null;
}
```

- [ ] **Step 2: TypeScript check**

```powershell
cd C:\PokeFantasy\pokefantasy-web
node_modules/.bin/tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 3: Commit**

```powershell
git add src/hooks/useNotificationSse.ts src/App.tsx
git rm src/hooks/useNotificationPoller.ts
$msg = @'
feat: replace 30s polling with SSE for steal and trade notifications

Single EventSource per session replaces per-league setInterval polling.
Fallback to 120s polling if SSE connection drops.
'@
git commit -m $msg
```

- [ ] **Step 4: Push y PR frontend**

```powershell
git push -u origin feature/sse-notifications
```

Crear PR (frontend → `main`):
```powershell
. $PROFILE
$h = @{ Authorization = "Bearer $env:GITHUB_TOKEN"; Accept = "application/vnd.github+json" }
$body = "Reemplaza polling 30s por SSE. EventSource unico por sesion. Fallback 120s si SSE cae."
$pr = [ordered]@{ title = "feat: SSE notificaciones tiempo real (robos y trades)"; head = "feature/sse-notifications"; base = "main"; body = $body } | ConvertTo-Json
Invoke-RestMethod "https://api.github.com/repos/Pokemons-Fantasy/pokefantasy-web/pulls" -Method Post -Headers $h -Body $pr -ContentType "application/json; charset=utf-8"
```

---

## Verificación end-to-end

| Check | Resultado esperado |
|-------|-------------------|
| `./mvnw -B -ntp clean verify` | BUILD SUCCESS, todos los tests PASS |
| Usuario A roba a usuario B (ambos logueados) | Toast en B en <1 s |
| Usuario A propone trade a usuario B | Toast en B en <1 s |
| Cancelar la conexión SSE (devtools → Network) | Fallback polling activo a 120 s |
| Reconectar SSE | Fallback se detiene |
| Evento ya visto (reconexión SSE) | No se muestra toast duplicado |
| `tsc --noEmit` | Sin errores |
