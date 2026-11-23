import { Router, type IRouter } from "express";
import goldRouter from "./gold";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(goldRouter);

export default router;
