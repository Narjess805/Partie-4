export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.code === "unrecognized_keys" ? i.keys.join(",") : i.path.join("."),
      message: i.message,
    }));
    return res.status(400).json({ error: "VALIDATION_ERROR", details });
  }
  req.body = result.data;
  next();
};
