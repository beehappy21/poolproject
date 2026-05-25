import { SetMetadata } from "@nestjs/common";

import type { AuthRole } from "../domain/auth.types";
import { ROLES_KEY } from "./metadata.constants";

export const Roles = (...roles: AuthRole[]) => SetMetadata(ROLES_KEY, roles);
