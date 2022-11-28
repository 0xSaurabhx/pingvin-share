import { Inject, Injectable } from "@nestjs/common";
import { Config } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class ConfigService {
  constructor(
    @Inject("CONFIG_VARIABLES") private configVariables: Config[],
    private prisma: PrismaService
  ) {}

  get(key: string): any {
    const configVariable = this.configVariables.filter(
      (variable) => variable.key == key
    )[0];

    if (!configVariable) throw new Error(`Config variable ${key} not found`);

    const value = configVariable.value ?? configVariable.default;

    if (configVariable.type == "number") return parseInt(value);
    if (configVariable.type == "boolean") return value == "true";
    if (configVariable.type == "string") return value;
  }

  async listForAdmin() {
    return await this.prisma.config.findMany();
  }

  async list() {
    const configVariables = await this.prisma.config.findMany({
      where: { secret: { equals: false } },
    });

    return configVariables.map((configVariable) => {
      if (!configVariable.value) configVariable.value = configVariable.default;

      return configVariable;
    });
  }
}
