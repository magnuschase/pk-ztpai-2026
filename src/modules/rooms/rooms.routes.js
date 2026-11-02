const { Router } = require("express");
const validate = require("../../middleware/validate");
const authorize = require("../../middleware/authorize");
const { ROLES } = require("../users/users.roles");
const createRoomsService = require("./rooms.service");
const createRoomsController = require("./rooms.controller");
const { roomIdParamSchema, createRoomSchema, updateRoomSchema } = require("./rooms.schemas");

function createRoomsRouter({ roomsRepository, buildingsRepository }) {
  const router = Router();
  const roomsService = createRoomsService({ roomsRepository, buildingsRepository });
  const roomsController = createRoomsController({ roomsService });
  // Before validate: a USER gets 403 whatever the body, without learning the validation rules
  const adminOnly = authorize(ROLES.ADMIN);

  // Reading - any logged-in user (authenticate runs for the whole app)
  router.get("/", roomsController.listRooms);
  router.get("/:id", validate({ params: roomIdParamSchema }), roomsController.getRoomById);

  // Managing - ADMIN only
  router.post("/", adminOnly, validate({ body: createRoomSchema }), roomsController.createRoom);
  router.patch(
    "/:id",
    adminOnly,
    validate({ params: roomIdParamSchema, body: updateRoomSchema }),
    roomsController.updateRoom,
  );
  router.delete(
    "/:id",
    adminOnly,
    validate({ params: roomIdParamSchema }),
    roomsController.deleteRoom,
  );

  return router;
}

module.exports = createRoomsRouter;
