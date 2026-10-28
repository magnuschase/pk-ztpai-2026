const { Router } = require("express");
const validate = require("../../middleware/validate");
const createRoomsService = require("./rooms.service");
const createRoomsController = require("./rooms.controller");
const { roomIdParamSchema } = require("./rooms.schemas");

function createRoomsRouter({ roomsRepository }) {
  const router = Router();
  const roomsService = createRoomsService({ roomsRepository });
  const roomsController = createRoomsController({ roomsService });

  router.get("/", roomsController.listRooms);
  router.get("/:id", validate({ params: roomIdParamSchema }), roomsController.getRoomById);

  return router;
}

module.exports = createRoomsRouter;
