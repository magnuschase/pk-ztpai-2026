class RoomsRepository {
  #rooms;

  constructor() {
    this.#rooms = [
      { id: 1, name: "A101", capacity: 30 },
      { id: 2, name: "A102", capacity: 25 },
      { id: 3, name: "A103", capacity: 35 },
      { id: 4, name: "A104", capacity: 40 },
    ];
  }

  async findAll() {
    return this.#rooms;
  }

  async findById(id) {
    return this.#rooms.find((room) => room.id === id) ?? null;
  }
}

module.exports = RoomsRepository;
