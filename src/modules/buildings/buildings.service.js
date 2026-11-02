const { NotFoundError, ConflictError } = require("../../errors");
const { PG_FOREIGN_KEY_VIOLATION } = require("../../errors/postgres");

function createBuildingsService({ buildingsRepository, roomsRepository }) {
  async function listBuildings() {
    return buildingsRepository.findAll();
  }

  async function getBuildingById(id) {
    const building = await buildingsRepository.findById(id);
    if (!building) {
      throw new NotFoundError("Building not found", "BUILDING_NOT_FOUND");
    }
    return building;
  }

  async function listBuildingRooms(id) {
    await getBuildingById(id);
    return roomsRepository.findAllByBuildingId(id);
  }

  async function createBuilding(input) {
    return buildingsRepository.create({
      name: input.name,
      address: input.address,
    });
  }

  // Duplicate name is rejected by the UNIQUE constraint -> 409 in errorHandler
  async function updateBuilding(id, patch) {
    const building = await buildingsRepository.update(id, {
      name: patch.name,
      address: patch.address,
    });
    if (!building) {
      throw new NotFoundError("Building not found", "BUILDING_NOT_FOUND");
    }
    return building;
  }

  // rooms.building_id is ON DELETE RESTRICT - the database refuses to delete a building
  // that still has rooms, so there is no "count rooms, then delete" race
  async function deleteBuilding(id) {
    let deleted;
    try {
      deleted = await buildingsRepository.delete(id);
    } catch (err) {
      if (err.code === PG_FOREIGN_KEY_VIOLATION && err.constraint === "rooms_building_id_foreign") {
        throw new ConflictError("Building still has rooms and cannot be deleted", "BUILDING_HAS_ROOMS");
      }
      throw err;
    }
    if (!deleted) {
      throw new NotFoundError("Building not found", "BUILDING_NOT_FOUND");
    }
  }

  return {
    listBuildings,
    getBuildingById,
    listBuildingRooms,
    createBuilding,
    updateBuilding,
    deleteBuilding,
  };
}

module.exports = createBuildingsService;
