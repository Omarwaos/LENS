export function createResourceController(service, entity, createRecord) {
  return {
    async list(req, res) {
      res.json(await service.list(entity));
    },
    async get(req, res) {
      res.json(await service.get(entity, req.resourceId));
    },
    async create(req, res) {
      res.status(201).json(await createRecord(req.body));
    },
    async update(req, res) {
      res.json(await service.save(entity, req.body, req.resourceId));
    },
    async remove(req, res) {
      res.json(await service.remove(entity, req.resourceId));
    },
  };
}
