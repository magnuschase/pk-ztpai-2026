const { toBuildingResponse } = require("./buildings.mapper");

function createBuildingsController({ buildingsService }) {
  async function listBuildings(req, res) {
    const buildings = await buildingsService.listBuildings();
    res.json(buildings.map(toBuildingResponse));
  }

  async function getBuildingById(req, res) {
    const { id } = req.validated.params;
    const building = await buildingsService.getBuildingById(id);
    res.json(toBuildingResponse(building));
  }

  async function createBuilding(req, res) {
    const building = await buildingsService.createBuilding(req.validated.body);
    res
      .status(201)
      .location(`/api/buildings/${building.id}`)
      .json(toBuildingResponse(building));
  }

  return { listBuildings, getBuildingById, createBuilding };
}

module.exports = createBuildingsController;
