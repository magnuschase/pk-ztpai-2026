const { NotFoundError } = require("../../errors");

function createBuildingsService({ buildingsRepository }) {
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

  async function createBuilding(input) {
    return buildingsRepository.create({
      name: input.name,
      address: input.address,
    });
  }

  return { listBuildings, getBuildingById, createBuilding };
}

module.exports = createBuildingsService;
