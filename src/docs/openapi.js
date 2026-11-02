// OpenAPI 3.1 description of the API - Swagger UI at /api/docs, raw JSON at
// /api/docs/openapi.json. Every error response points to the one Error schema ($ref).

const schema = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (bodySchema) => ({ "application/json": { schema: bodySchema } });

const REQUEST_ID = "3f2b8c1e-6a4d-4e0b-9b7a-2c5d8e9f1a20";

// Error response with examples of the codes this endpoint returns: [code, message, details?]
function errorResponse(description, ...examples) {
  return {
    description,
    content: {
      "application/json": {
        schema: schema("Error"),
        examples: Object.fromEntries(
          examples.map(([code, message, details]) => [
            code,
            {
              value: {
                error: {
                  code,
                  message,
                  ...(details ? { details } : {}),
                  requestId: REQUEST_ID,
                },
              },
            },
          ]),
        ),
      },
    },
  };
}

// 400 VALIDATION_ERROR with the given field errors: [location, field, message]
const fieldErrors = (...errors) =>
  errors.map(([location, field, message]) => ({ location, field, message }));
const validationExample = (...errors) => [
  "VALIDATION_ERROR",
  "Validation failed",
  fieldErrors(...errors),
];
const INVALID_JSON = ["INVALID_JSON", "Request body contains invalid JSON"];
const INVALID_ID = validationExample([
  "params",
  "id",
  "id must be a positive integer",
]);

const ref = (name) => ({ $ref: `#/components/responses/${name}` });
const created = (description, bodySchema) => ({
  description,
  headers: {
    Location: {
      description: "Adres nowego zasobu",
      schema: { type: "string" },
    },
  },
  content: json(bodySchema),
});

const idParam = (description) => ({
  ...{ $ref: "#/components/parameters/Id" },
  description,
});

module.exports = {
  openapi: "3.1.0",
  info: {
    title: "Room Booking API",
    version: "4.0.0",
  },
  tags: [
    {
      name: "Auth",
      description: "Rejestracja, logowanie, zalogowany użytkownik",
    },
    {
      name: "Buildings",
      description: "Odczyt - każdy zalogowany, zmiany - tylko ADMIN",
    },
    {
      name: "Rooms",
      description: "Odczyt - każdy zalogowany, zmiany - tylko ADMIN",
    },
    {
      name: "Reservations",
      description: "USER - tylko własne rezerwacje, ADMIN - wszystkie",
    },
    { name: "Debug", description: "Test obsługi nieoczekiwanych błędów" },
  ],
  // Every operation needs the token, unless it sets security: []
  security: [{ bearerAuth: [] }],
  paths: {
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Rejestracja",
        description:
          "Tworzy konto z rolą `USER` (konto ADMIN powstaje tylko w seedzie). Email jest " +
          "normalizowany do małych liter, hasło zapisywane jako hash bcrypt.",
        security: [],
        requestBody: {
          required: true,
          content: json(schema("RegisterRequest")),
        },
        responses: {
          201: {
            description: "Konto utworzone",
            content: json(schema("User")),
          },
          400: errorResponse(
            "Niepoprawne dane, nieznane pole (np. `role`) albo niepoprawny JSON",
            validationExample([
              "body",
              "password",
              "password must be at least 10 characters long",
            ]),
            INVALID_JSON,
          ),
          409: errorResponse(
            "Email jest już zajęty (bez względu na wielkość liter)",
            ["EMAIL_TAKEN", "Email is already taken"],
          ),
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Logowanie",
        description:
          "Zwraca token JWT (HS256). Zły email i złe hasło dają identyczną odpowiedź 401.",
        security: [],
        requestBody: { required: true, content: json(schema("LoginRequest")) },
        responses: {
          200: {
            description: "Zalogowano",
            headers: {
              "Cache-Control": {
                description: "no-store",
                schema: { type: "string" },
              },
            },
            content: json(schema("TokenResponse")),
          },
          400: errorResponse(
            "Brak pola, nieznane pole albo niepoprawny JSON",
            validationExample(["body", "password", "password is required"]),
            INVALID_JSON,
          ),
          401: errorResponse("Zły email lub hasło", [
            "INVALID_CREDENTIALS",
            "Invalid email or password",
          ]),
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Zalogowany użytkownik",
        responses: {
          200: {
            description: "Dane użytkownika z tokenu",
            content: json(schema("User")),
          },
          401: ref("Unauthorized"),
        },
      },
    },

    "/api/buildings": {
      get: {
        tags: ["Buildings"],
        summary: "Lista budynków",
        responses: {
          200: {
            description: "Budynki z liczbą sal",
            content: json({ type: "array", items: schema("Building") }),
          },
          401: ref("Unauthorized"),
        },
      },
      post: {
        tags: ["Buildings"],
        summary: "Nowy budynek (ADMIN)",
        requestBody: {
          required: true,
          content: json(schema("CreateBuildingRequest")),
        },
        responses: {
          201: created("Budynek utworzony", schema("Building")),
          400: errorResponse(
            "Niepoprawne dane albo niepoprawny JSON",
            validationExample([
              "body",
              "address",
              "address must be at least 5 characters long",
            ]),
            INVALID_JSON,
          ),
          401: ref("Unauthorized"),
          403: ref("Forbidden"),
          409: errorResponse("Budynek o tej nazwie już istnieje", [
            "ALREADY_EXISTS",
            "Resource with the same unique fields already exists",
          ]),
        },
      },
    },
    "/api/buildings/{id}": {
      parameters: [idParam("ID budynku")],
      get: {
        tags: ["Buildings"],
        summary: "Budynek",
        responses: {
          200: { description: "Budynek", content: json(schema("Building")) },
          400: errorResponse("Niepoprawne ID", INVALID_ID),
          401: ref("Unauthorized"),
          404: errorResponse("Nie ma takiego budynku", [
            "BUILDING_NOT_FOUND",
            "Building not found",
          ]),
        },
      },
      patch: {
        tags: ["Buildings"],
        summary: "Zmiana budynku (ADMIN)",
        requestBody: {
          required: true,
          content: json(schema("UpdateBuildingRequest")),
        },
        responses: {
          200: {
            description: "Budynek po zmianie",
            content: json(schema("Building")),
          },
          400: errorResponse(
            "Niepoprawne ID lub dane, pusty body albo niepoprawny JSON",
            validationExample([
              "body",
              "body",
              "At least one field (name, address) is required",
            ]),
            INVALID_JSON,
          ),
          401: ref("Unauthorized"),
          403: ref("Forbidden"),
          404: errorResponse("Nie ma takiego budynku", [
            "BUILDING_NOT_FOUND",
            "Building not found",
          ]),
          409: errorResponse("Budynek o tej nazwie już istnieje", [
            "ALREADY_EXISTS",
            "Resource with the same unique fields already exists",
          ]),
        },
      },
      delete: {
        tags: ["Buildings"],
        summary: "Usunięcie budynku (ADMIN)",
        responses: {
          204: { description: "Budynek usunięty" },
          400: errorResponse("Niepoprawne ID", INVALID_ID),
          401: ref("Unauthorized"),
          403: ref("Forbidden"),
          404: errorResponse("Nie ma takiego budynku", [
            "BUILDING_NOT_FOUND",
            "Building not found",
          ]),
          409: errorResponse("Budynek ma sale - najpierw trzeba je usunąć", [
            "BUILDING_HAS_ROOMS",
            "Building still has rooms and cannot be deleted",
          ]),
        },
      },
    },
    "/api/buildings/{id}/rooms": {
      parameters: [idParam("ID budynku")],
      get: {
        tags: ["Buildings"],
        summary: "Sale w budynku",
        responses: {
          200: {
            description: "Sale budynku",
            content: json({ type: "array", items: schema("Room") }),
          },
          400: errorResponse("Niepoprawne ID", INVALID_ID),
          401: ref("Unauthorized"),
          404: errorResponse("Nie ma takiego budynku", [
            "BUILDING_NOT_FOUND",
            "Building not found",
          ]),
        },
      },
    },

    "/api/rooms": {
      get: {
        tags: ["Rooms"],
        summary: "Lista sal",
        responses: {
          200: {
            description: "Sale z budynkami",
            content: json({ type: "array", items: schema("Room") }),
          },
          401: ref("Unauthorized"),
        },
      },
      post: {
        tags: ["Rooms"],
        summary: "Nowa sala (ADMIN)",
        requestBody: {
          required: true,
          content: json(schema("CreateRoomRequest")),
        },
        responses: {
          201: created("Sala utworzona", schema("Room")),
          400: errorResponse(
            "Niepoprawne dane albo niepoprawny JSON",
            validationExample([
              "body",
              "capacity",
              "capacity must be a positive integer",
            ]),
            INVALID_JSON,
          ),
          401: ref("Unauthorized"),
          403: ref("Forbidden"),
          404: errorResponse("Nie ma takiego budynku", [
            "BUILDING_NOT_FOUND",
            "Building not found",
          ]),
          409: errorResponse("Sala o tej nazwie już jest w tym budynku", [
            "ALREADY_EXISTS",
            "Resource with the same unique fields already exists",
          ]),
        },
      },
    },
    "/api/rooms/{id}": {
      parameters: [idParam("ID sali")],
      get: {
        tags: ["Rooms"],
        summary: "Sala",
        responses: {
          200: { description: "Sala", content: json(schema("Room")) },
          400: errorResponse("Niepoprawne ID", INVALID_ID),
          401: ref("Unauthorized"),
          404: errorResponse("Nie ma takiej sali", [
            "ROOM_NOT_FOUND",
            "Room not found",
          ]),
        },
      },
      patch: {
        tags: ["Rooms"],
        summary: "Zmiana sali (ADMIN)",
        description:
          "Można zmienić nazwę i pojemność. Przeniesienie sali do innego budynku nie jest możliwe.",
        requestBody: {
          required: true,
          content: json(schema("UpdateRoomRequest")),
        },
        responses: {
          200: {
            description: "Sala po zmianie",
            content: json(schema("Room")),
          },
          400: errorResponse(
            "Niepoprawne ID lub dane, pusty body albo niepoprawny JSON",
            validationExample([
              "body",
              "body",
              'Unrecognized key: "buildingId"',
            ]),
            INVALID_JSON,
          ),
          401: ref("Unauthorized"),
          403: ref("Forbidden"),
          404: errorResponse("Nie ma takiej sali", [
            "ROOM_NOT_FOUND",
            "Room not found",
          ]),
          409: errorResponse("Sala o tej nazwie już jest w tym budynku", [
            "ALREADY_EXISTS",
            "Resource with the same unique fields already exists",
          ]),
        },
      },
      delete: {
        tags: ["Rooms"],
        summary: "Usunięcie sali (ADMIN)",
        responses: {
          204: { description: "Sala usunięta" },
          400: errorResponse("Niepoprawne ID", INVALID_ID),
          401: ref("Unauthorized"),
          403: ref("Forbidden"),
          404: errorResponse("Nie ma takiej sali", [
            "ROOM_NOT_FOUND",
            "Room not found",
          ]),
          409: errorResponse(
            "Sala ma rezerwacje (także przeszłe lub anulowane - to historia)",
            [
              "ROOM_HAS_RESERVATIONS",
              "Room has reservations and cannot be deleted",
            ],
          ),
        },
      },
    },

    "/api/reservations": {
      get: {
        tags: ["Reservations"],
        summary: "Lista rezerwacji",
        description:
          "USER widzi tylko swoje rezerwacje (filtr dokłada backend), ADMIN - wszystkie. " +
          "Filtry, sortowanie i paginacja działają dla obu ról.",
        parameters: [
          {
            name: "userId",
            in: "query",
            description: "Tylko dla ADMINa - USER dostaje 403",
            schema: { type: "integer", minimum: 1 },
          },
          {
            name: "roomId",
            in: "query",
            schema: { type: "integer", minimum: 1 },
          },
          {
            name: "buildingId",
            in: "query",
            schema: { type: "integer", minimum: 1 },
          },
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["CONFIRMED", "CANCELLED"] },
          },
          {
            name: "from",
            in: "query",
            description:
              "Rezerwacje kończące się po tej chwili (ISO 8601 ze strefą czasową)",
            schema: { type: "string", format: "date-time" },
            example: "2026-12-01T00:00:00Z",
          },
          {
            name: "to",
            in: "query",
            description:
              "Rezerwacje zaczynające się przed tą chwilą; `from` < `to`",
            schema: { type: "string", format: "date-time" },
            example: "2026-12-31T23:59:59Z",
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: "sort",
            in: "query",
            description: "Pole sortowania, `-` na początku = malejąco",
            schema: {
              type: "string",
              enum: [
                "startTime",
                "-startTime",
                "createdAt",
                "-createdAt",
                "participants",
                "-participants",
              ],
              default: "startTime",
            },
          },
        ],
        responses: {
          200: {
            description: "Strona rezerwacji",
            content: json(schema("ReservationPage")),
          },
          400: errorResponse(
            "Niepoprawny parametr query",
            validationExample([
              "query",
              "limit",
              "limit must be between 1 and 100",
            ]),
          ),
          401: ref("Unauthorized"),
          403: errorResponse("USER użył filtra `userId`", [
            "FORBIDDEN",
            "Only an ADMIN can filter reservations by userId",
          ]),
        },
      },
      post: {
        tags: ["Reservations"],
        summary: "Nowa rezerwacja",
        description:
          "Właścicielem jest zalogowany użytkownik (z tokenu) - pole `userId` / `reservedBy` w body daje 400. " +
          "Rezerwacja trwa od 15 minut do 8 godzin i nie może zaczynać się w przeszłości.",
        requestBody: {
          required: true,
          content: json(schema("CreateReservationRequest")),
        },
        responses: {
          201: created("Rezerwacja utworzona", schema("Reservation")),
          400: errorResponse(
            "Niepoprawne dane, nieznane pole albo niepoprawny JSON",
            validationExample(["body", "body", 'Unrecognized key: "userId"']),
            validationExample([
              "body",
              "startTime",
              "startTime cannot be in the past",
            ]),
            INVALID_JSON,
          ),
          401: ref("Unauthorized"),
          404: errorResponse("Nie ma takiej sali", [
            "ROOM_NOT_FOUND",
            "Room not found",
          ]),
          409: errorResponse(
            "Sala zajęta w tym czasie albo za mała",
            [
              "ROOM_ALREADY_BOOKED",
              "Room is already booked for the requested time range",
            ],
            ["ROOM_CAPACITY_EXCEEDED", "Room capacity exceeded"],
          ),
        },
      },
    },
    "/api/reservations/{id}": {
      parameters: [idParam("ID rezerwacji")],
      get: {
        tags: ["Reservations"],
        summary: "Rezerwacja",
        description:
          "Właściciel lub ADMIN. Cudza rezerwacja daje USERowi 404 - jak nieistniejąca.",
        responses: {
          200: {
            description: "Rezerwacja",
            content: json(schema("Reservation")),
          },
          400: errorResponse("Niepoprawne ID", INVALID_ID),
          401: ref("Unauthorized"),
          404: errorResponse(
            "Nie ma takiej rezerwacji albo należy do kogoś innego",
            ["RESERVATION_NOT_FOUND", "Reservation not found"],
          ),
        },
      },
    },
    "/api/reservations/{id}/cancel": {
      parameters: [idParam("ID rezerwacji")],
      patch: {
        tags: ["Reservations"],
        summary: "Anulowanie rezerwacji",
        description:
          "Właściciel lub ADMIN (ten sam zakaz anulowania rozpoczętej rezerwacji obowiązuje obie role). " +
          "Anulowanie już anulowanej rezerwacji zwraca 200 bez zmian.",
        responses: {
          200: {
            description: "Rezerwacja po anulowaniu",
            content: json(schema("Reservation")),
          },
          400: errorResponse("Niepoprawne ID", INVALID_ID),
          401: ref("Unauthorized"),
          404: errorResponse(
            "Nie ma takiej rezerwacji albo należy do kogoś innego",
            ["RESERVATION_NOT_FOUND", "Reservation not found"],
          ),
          409: errorResponse("Rezerwacja już się rozpoczęła", [
            "RESERVATION_ALREADY_STARTED",
            "Reservation has already started and cannot be cancelled",
          ]),
        },
      },
    },

    "/api/debug/crash": {
      get: {
        tags: ["Debug"],
        summary: "Celowy błąd serwera",
        description:
          "Rzuca wyjątek - pokazuje, że klient dostaje ogólne 500 bez szczegółów (stack trace zostaje w logach).",
        responses: {
          401: ref("Unauthorized"),
          500: errorResponse("Nieoczekiwany błąd serwera", [
            "INTERNAL_ERROR",
            "Internal server error",
          ]),
        },
      },
    },
  },

  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "accessToken z `POST /api/auth/login` (sam token, bez słowa `Bearer`)",
      },
    },
    parameters: {
      Id: {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "integer", minimum: 1 },
      },
    },
    responses: {
      Unauthorized: errorResponse(
        "Brak tokenu, zły format nagłówka, nieprawidłowy albo wygasły token",
        ["MISSING_TOKEN", "Missing Authorization header"],
        [
          "INVALID_AUTH_HEADER",
          "Authorization header must have the format: Bearer <token>",
        ],
        ["INVALID_TOKEN", "Invalid token"],
        ["TOKEN_EXPIRED", "Token expired"],
      ),
      Forbidden: errorResponse("Zalogowany użytkownik nie ma roli ADMIN", [
        "FORBIDDEN",
        "You do not have permission to perform this action",
      ]),
    },
    schemas: {
      // The one error format of the whole API - every error response refers to it
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message", "requestId"],
            properties: {
              code: {
                type: "string",
                description:
                  "Stały kod błędu - na nim opiera się frontend, nie na treści komunikatu",
                examples: ["VALIDATION_ERROR"],
              },
              message: {
                type: "string",
                description: "Opis dla człowieka",
                examples: ["Validation failed"],
              },
              details: {
                type: "array",
                description:
                  "Tylko przy `VALIDATION_ERROR` - lista błędnych pól",
                items: {
                  type: "object",
                  required: ["location", "field", "message"],
                  properties: {
                    location: {
                      type: "string",
                      enum: ["params", "query", "body"],
                    },
                    field: { type: "string", examples: ["password"] },
                    message: {
                      type: "string",
                      examples: [
                        "password must be at least 10 characters long",
                      ],
                    },
                  },
                },
              },
              requestId: {
                type: "string",
                description:
                  "Identyfikator żądania - ten sam co w nagłówku `X-Request-Id` i w logach serwera",
                examples: [REQUEST_ID],
              },
            },
          },
        },
      },

      RegisterRequest: {
        type: "object",
        required: ["email", "password"],
        additionalProperties: false,
        properties: {
          email: {
            type: "string",
            format: "email",
            maxLength: 254,
            examples: ["Tomasz.Lewandowski@example.com"],
          },
          password: {
            type: "string",
            minLength: 10,
            maxLength: 72,
            description: "Maksymalnie 72 bajty w UTF-8 (limit bcrypt)",
            examples: ["bardzo-dlugie-haslo"],
          },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        additionalProperties: false,
        properties: {
          email: {
            type: "string",
            format: "email",
            examples: ["admin@example.com"],
          },
          password: {
            type: "string",
            minLength: 1,
            examples: ["admin-dev-password"],
          },
        },
      },
      TokenResponse: {
        type: "object",
        required: ["accessToken", "tokenType", "expiresIn"],
        properties: {
          accessToken: {
            type: "string",
            description: "JWT (HS256) z claimami sub, role, iat, exp",
          },
          tokenType: { type: "string", enum: ["Bearer"] },
          expiresIn: { type: "string", examples: ["15m"] },
        },
      },
      User: {
        type: "object",
        required: ["id", "email", "role", "createdAt"],
        properties: {
          id: { type: "integer", examples: [2] },
          email: {
            type: "string",
            format: "email",
            examples: ["jan.kowalski@example.com"],
          },
          role: { type: "string", enum: ["USER", "ADMIN"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },

      BuildingRef: {
        type: "object",
        required: ["id", "name"],
        properties: {
          id: { type: "integer", examples: [1] },
          name: { type: "string", examples: ["Budynek A"] },
        },
      },
      Building: {
        type: "object",
        required: ["id", "name", "address", "roomsCount"],
        properties: {
          id: { type: "integer", examples: [1] },
          name: { type: "string", examples: ["Budynek A"] },
          address: { type: "string", examples: ["ul. Warszawska 24, Kraków"] },
          roomsCount: { type: "integer", examples: [3] },
        },
      },
      CreateBuildingRequest: {
        type: "object",
        required: ["name", "address"],
        additionalProperties: false,
        properties: {
          name: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            examples: ["Budynek C"],
          },
          address: {
            type: "string",
            minLength: 5,
            maxLength: 255,
            examples: ["ul. Testowa 1, Kraków"],
          },
        },
      },
      UpdateBuildingRequest: {
        type: "object",
        description: "Co najmniej jedno pole",
        minProperties: 1,
        additionalProperties: false,
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100 },
          address: {
            type: "string",
            minLength: 5,
            maxLength: 255,
            examples: ["ul. Zmieniona 2, Kraków"],
          },
        },
      },

      Room: {
        type: "object",
        required: ["id", "name", "capacity", "building"],
        properties: {
          id: { type: "integer", examples: [1] },
          name: { type: "string", examples: ["101"] },
          capacity: { type: "integer", examples: [30] },
          building: schema("BuildingRef"),
        },
      },
      CreateRoomRequest: {
        type: "object",
        required: ["buildingId", "name", "capacity"],
        additionalProperties: false,
        properties: {
          buildingId: { type: "integer", minimum: 1, examples: [1] },
          name: {
            type: "string",
            minLength: 1,
            maxLength: 50,
            examples: ["301"],
          },
          capacity: { type: "integer", minimum: 1, examples: [40] },
        },
      },
      UpdateRoomRequest: {
        type: "object",
        description: "Co najmniej jedno pole",
        minProperties: 1,
        additionalProperties: false,
        properties: {
          name: { type: "string", minLength: 1, maxLength: 50 },
          capacity: { type: "integer", minimum: 1, examples: [45] },
        },
      },

      Reservation: {
        type: "object",
        required: [
          "id",
          "room",
          "user",
          "participants",
          "startTime",
          "endTime",
          "status",
          "createdAt",
          "cancelledAt",
        ],
        properties: {
          id: { type: "integer", examples: [1] },
          room: {
            type: "object",
            required: ["id", "name", "building"],
            properties: {
              id: { type: "integer", examples: [3] },
              name: { type: "string", examples: ["201"] },
              building: schema("BuildingRef"),
            },
          },
          user: {
            type: "object",
            description: "Właściciel rezerwacji",
            required: ["id", "email"],
            properties: {
              id: { type: "integer", examples: [2] },
              email: {
                type: "string",
                format: "email",
                examples: ["jan.kowalski@example.com"],
              },
            },
          },
          participants: { type: "integer", examples: [10] },
          startTime: { type: "string", format: "date-time" },
          endTime: { type: "string", format: "date-time" },
          status: { type: "string", enum: ["CONFIRMED", "CANCELLED"] },
          createdAt: { type: "string", format: "date-time" },
          cancelledAt: { type: ["string", "null"], format: "date-time" },
        },
      },
      ReservationPage: {
        type: "object",
        required: ["data", "meta"],
        properties: {
          data: { type: "array", items: schema("Reservation") },
          meta: {
            type: "object",
            required: ["page", "limit", "total", "totalPages"],
            properties: {
              page: { type: "integer", examples: [1] },
              limit: { type: "integer", examples: [20] },
              total: { type: "integer", examples: [42] },
              totalPages: { type: "integer", examples: [3] },
            },
          },
        },
      },
      CreateReservationRequest: {
        type: "object",
        required: ["roomId", "participants", "startTime", "endTime"],
        additionalProperties: false,
        properties: {
          roomId: { type: "integer", minimum: 1, examples: [3] },
          participants: { type: "integer", minimum: 1, examples: [10] },
          startTime: {
            type: "string",
            format: "date-time",
            description:
              "ISO 8601 ze strefą czasową (`Z` lub `+01:00`), nie w przeszłości",
            examples: ["2026-12-15T10:00:00Z"],
          },
          endTime: {
            type: "string",
            format: "date-time",
            description: "Od 15 minut do 8 godzin po `startTime`",
            examples: ["2026-12-15T12:00:00Z"],
          },
        },
      },
    },
  },
};
