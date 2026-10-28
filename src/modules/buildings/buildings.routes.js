const { Router } = require("express");
const validate = require("../../middleware/validate");
const createBuildingsService = require("./buildings.service");
const createBuildingsController = require("./buildings.controller");
const { createBuildingSchema, buildingIdParamSchema } = require("./buildings.schemas");

function createBuildingsRouter({ buildingsRepository }) {
  const router = Router();
  const buildingsService = createBuildingsService({ buildingsRepository });
  const buildingsController = createBuildingsController({ buildingsService });

  router.get("/", buildingsController.listBuildings);
  router.get("/:id", validate({ params: buildingIdParamSchema }), buildingsController.getBuildingById);
  router.post("/", validate({ body: createBuildingSchema }), buildingsController.createBuilding);

  return router;
}

module.exports = createBuildingsRouter;
