const { NotFoundError } = require("../../errors");

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

  return { listBuildings, getBuildingById, listBuildingRooms, createBuilding };
}

module.exports = createBuildingsService;
