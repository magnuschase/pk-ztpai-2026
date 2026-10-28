const { uniqueViolation } = require("../../errors/postgres");

class BuildingsRepository {
  #buildings;
  #nextId;

  constructor() {
    this.#buildings = [
      { id: 1, name: "Budynek A", address: "ul. Warszawska 24, Kraków" },
      { id: 2, name: "Budynek B", address: "al. Jana Pawła II 37, Kraków" },
    ];
    this.#nextId = this.#buildings.length + 1;
  }

  async findAll() {
    return this.#buildings;
  }

  async findById(id) {
    return this.#buildings.find((building) => building.id === id) ?? null;
  }

  async create(data) {
    if (this.#buildings.some((building) => building.name === data.name)) {
      throw uniqueViolation("buildings_name_unique");
    }
    const building = { id: this.#nextId++, ...data };
    this.#buildings.push(building);
    return building;
  }
}

module.exports = BuildingsRepository;
