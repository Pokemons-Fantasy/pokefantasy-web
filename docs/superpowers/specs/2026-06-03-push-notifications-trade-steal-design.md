# Push Notifications (Trade + Steal) — Design

## Goal

Enviar notificaciones push FCM a jugadores Android cuando alguien les propone un trade o roba uno de sus Pokémon.

## Out of scope

- Notificaciones de turno de draft
- Notificaciones de ventana de robo/swap abierta (PR separado, requiere @Scheduled)
- iOS (sin Apple Developer account)
- Notificaciones a usuarios sin la app instalada (sin token registrado → silencio, sin error)

## Architecture

```
Frontend (Capacitor)                  Backend (Spring Boot)
─────────────────────                 ──────────────────────────────────
App arranca
  → solicita permiso FCM
  → obtiene token FCM               POST /v1/users/push-token
  → llama al backend         ──────────────────────────────────────────▶
                                      RegisterPushTokenCommandHandler
                                        → UserRepository.addFcmToken()
                                        → guarda en UserEntity.fcmTokens

Trade propuesto                       ProposeTradeCommandHandler
                                        → PushNotificationPort.send(
                                            tokens del responder,
                                            "Trade propuesto",
                                            "X quiere intercambiar ...")

Pokémon robado                        StealPokemonCommandHandler
                                        → PushNotificationPort.send(
                                            tokens de la víctima,
                                            "Te han robado un Pokémon",
                                            "X te ha robado a ...")
```

## Backend

### Dependencia Maven

En `infrastructure/pom.xml`:
```xml
<dependency>
    <groupId>com.google.firebase</groupId>
    <artifactId>firebase-admin</artifactId>
    <version>9.4.2</version>
</dependency>
```

### Domain — PushNotificationPort

Nuevo fichero `domain/src/main/java/com/villu/pokefantasy/repository/PushNotificationPort.java`:
```java
package com.villu.pokefantasy.repository;

import java.util.List;

public interface PushNotificationPort {
    /** Envía notificación a todos los tokens. Ignora tokens inválidos silenciosamente. */
    void send(List<String> fcmTokens, String title, String body);
}
```

Si la lista de tokens está vacía o el usuario no tiene la app instalada, no hace nada.

### Domain — UserEntity

Añadir campo en `UserEntity`:
```java
private List<String> fcmTokens = new ArrayList<>();
```

### Domain — UserRepository

Añadir dos métodos:
```java
void addFcmToken(String username, String token);
void removeFcmToken(String username, String token);  // para cleanup futuro
```

### Infrastructure — FirebasePushNotificationAdapter

`infrastructure/src/main/java/com/villu/pokefantasy/push/FirebasePushNotificationAdapter.java`

- `@PostConstruct` inicializa `FirebaseApp` con `GoogleCredentials` leídas del JSON en `FIREBASE_SERVICE_ACCOUNT_JSON` env var.
- `send()` usa `FirebaseMessaging.getInstance().sendEachForMulticast()` para enviar a múltiples tokens.
- Tokens inválidos/expirados (`UNREGISTERED`, `INVALID_ARGUMENT`) se eliminan automáticamente llamando a `removeFcmToken`.
- Si `FIREBASE_SERVICE_ACCOUNT_JSON` no está definida (entorno local), el adapter no se inicializa y `send()` hace log warning + no-op.

### Infrastructure — UserRepositoryImpl

Añadir:
```java
@Override
public void addFcmToken(String username, String token) {
    Query query = Query.query(Criteria.where("name").is(username));
    Update update = new Update().addToSet("fcmTokens", token);
    mongoTemplate.updateFirst(query, update, UserEntity.class);
}

@Override
public void removeFcmToken(String username, String token) {
    Query query = Query.query(Criteria.where("name").is(username));
    Update update = new Update().pull("fcmTokens", token);
    mongoTemplate.updateFirst(query, update, UserEntity.class);
}
```

### Application — RegisterPushTokenCommand

Sigue el patrón CQRS del proyecto:
- `RegisterPushTokenCommand`: record(username, token) implements Command
- `RegisterPushTokenCommandHandler`: llama `userRepository.addFcmToken(username, token)`
- `UserFacade.registerPushToken(username, token)`

### API — UserController

```java
@PostMapping("/users/push-token")
public ResponseEntity<Void> registerPushToken(
        @RequestHeader("Authorization") String authHeader,
        @RequestBody Map<String, String> body) throws Exception {
    String username = jwtService.extractUsername(authHeader.replace("Bearer ", ""));
    userFacade.registerPushToken(username, body.get("token"));
    return ResponseEntity.ok().build();
}
```

El username se extrae del JWT, no del body — el cliente no puede falsificar el username.

### Command handlers — disparadores

**ProposeTradeCommandHandler**: al final del `handle()`, después de guardar el trade:
```java
UserEntity responder = userRepository.findByUsername(trade.getResponder());
if (responder != null && !responder.getFcmTokens().isEmpty()) {
    pushNotificationPort.send(
        responder.getFcmTokens(),
        "Trade propuesto",
        command.proposerUsername() + " quiere intercambiar " +
        command.proposerPokemon() + " por tu " + command.responderPokemon()
    );
}
```

**StealPokemonCommandHandler**: al final del `handle()`, después de guardar el draft:
```java
UserEntity victim = userRepository.findByUsername(originalOwner);
if (victim != null && !victim.getFcmTokens().isEmpty()) {
    pushNotificationPort.send(
        victim.getFcmTokens(),
        "Te han robado un Pokémon",
        command.stealer() + " te ha robado a " + targetName
    );
}
```

## Frontend

### Registro de token al arrancar

En `src/main.tsx`, después del `createRoot`:
```ts
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  PushNotifications.requestPermissions().then(({ receive }) => {
    if (receive === 'granted') {
      PushNotifications.register();
    }
  });

  PushNotifications.addListener('registration', async ({ value: token }) => {
    const authStorage = localStorage.getItem('auth-storage');
    if (!authStorage) return;
    const { state: { token: jwt } } = JSON.parse(authStorage);
    if (!jwt) return;
    await fetch('https://pokefantasy.onrender.com/v1/users/push-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ token }),
    });
  });
}
```

`Capacitor.isNativePlatform()` garantiza que este código solo corre en la app Android, no en el navegador web.

### Notificaciones en primer plano

FCM muestra notificaciones en segundo plano automáticamente. En primer plano, Capacitor las suprime por defecto — se pueden mostrar con `PushNotifications.addListener('pushNotificationReceived', ...)` si se quiere, pero es opcional para MVP.

## Seguridad

- El token FCM del device se asocia al usuario autenticado (JWT). No se puede registrar el token de otro usuario.
- Tokens inválidos se limpian automáticamente en el adapter para no acumular basura en MongoDB.
- `FIREBASE_SERVICE_ACCOUNT_JSON` solo existe en Render, nunca en el repo.

## Tests

- `FirebasePushNotificationAdapter`: mock de `FirebaseMessaging`, verificar que `sendEachForMulticast` se llama con los tokens correctos.
- `RegisterPushTokenCommandHandler`: verificar que `addFcmToken` se llama con username y token.
- `StealPokemonCommandHandler` tests existentes: mock `PushNotificationPort`, verificar que `send` se llama con el username de la víctima.
- `ProposeTradeCommandHandler` tests existentes: ídem.
