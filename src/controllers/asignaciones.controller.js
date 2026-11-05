export function createMovementController(service, action) {
  return async (req, res) => {
    res.json(await service.movement(req.resourceId, action, req.body));
  };
}
