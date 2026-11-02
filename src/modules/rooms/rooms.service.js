const { NotFoundError, ConflictError } = require("../../errors");
const { PG_FOREIGN_KEY_VIOLATION } = require("../../errors/postgres");

function createRoomsService({ roomsRepository, buildingsRepository }) {
  async function listRooms() {
    return roomsRepository.findAll();
  }

  async function getRoomById(id) {
    const room = await roomsRepository.findById(id);
    if (!room) {
      throw new NotFoundError("Room not found", "ROOM_NOT_FOUND");
    }
    return room;
  }

  async function createRoom(input) {
    const building = await buildingsRepository.findById(input.buildingId);
    if (!building) {
      throw new NotFoundError("Building not found", "BUILDING_NOT_FOUND");
    }

    // Duplicate (buildingId, name) is rejected by the UNIQUE constraint -> 409 in errorHandler
    return roomsRepository.create({
      buildingId: input.buildingId,
      name: input.name,
      capacity: input.capacity,
    });
  }

  // Duplicate name in the same building -> UNIQUE constraint -> 409 in errorHandler
  async function updateRoom(id, patch) {
    const room = await roomsRepository.update(id, { name: patch.name, capacity: patch.capacity });
    if (!room) {
      throw new NotFoundError("Room not found", "ROOM_NOT_FOUND");
    }
    return room;
  }

  // reservations.room_id is ON DELETE RESTRICT - any reservation (also a past or cancelled
  // one, it is history) keeps the room from being deleted
  async function deleteRoom(id) {
    let deleted;
    try {
      deleted = await roomsRepository.delete(id);
    } catch (err) {
      if (err.code === PG_FOREIGN_KEY_VIOLATION && err.constraint === "reservations_room_id_foreign") {
        throw new ConflictError("Room has reservations and cannot be deleted", "ROOM_HAS_RESERVATIONS");
      }
      throw err;
    }
    if (!deleted) {
      throw new NotFoundError("Room not found", "ROOM_NOT_FOUND");
    }
  }

  return { listRooms, getRoomById, createRoom, updateRoom, deleteRoom };
}

module.exports = createRoomsService;
