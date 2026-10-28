const { Router } = require("express");
const validate = require("../../middleware/validate");
const createRoomsService = require("./rooms.service");
const createRoomsController = require("./rooms.controller");
const { roomIdParamSchema, createRoomSchema } = require("./rooms.schemas");

function createRoomsRouter({ roomsRepository, buildingsRepository }) {
  const router = Router();
  const roomsService = createRoomsService({ roomsRepository, buildingsRepository });
  const roomsController = createRoomsController({ roomsService });

  router.get("/", roomsController.listRooms);
  router.get("/:id", validate({ params: roomIdParamSchema }), roomsController.getRoomById);
  router.post("/", validate({ body: createRoomSchema }), roomsController.createRoom);

  return router;
}

module.exports = createRoomsRouter;
