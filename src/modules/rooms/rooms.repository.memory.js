const { uniqueViolation } = require("../../errors/postgres");

class RoomsRepository {
  #rooms;
  #nextId;

  constructor() {
    this.#rooms = [
      { id: 1, buildingId: 1, name: "A101", capacity: 30 },
      { id: 2, buildingId: 1, name: "A102", capacity: 25 },
      { id: 3, buildingId: 1, name: "A103", capacity: 35 },
      { id: 4, buildingId: 2, name: "A104", capacity: 40 },
    ];
    this.#nextId = this.#rooms.length + 1;
  }

  async findAll() {
    return this.#rooms;
  }

  async findById(id) {
    return this.#rooms.find((room) => room.id === id) ?? null;
  }

  async create(data) {
    const duplicate = this.#rooms.some(
      (room) => room.buildingId === data.buildingId && room.name === data.name,
    );
    if (duplicate) {
      throw uniqueViolation("rooms_building_id_name_unique");
    }
    const room = { id: this.#nextId++, ...data };
    this.#rooms.push(room);
    return room;
  }
}

module.exports = RoomsRepository;
