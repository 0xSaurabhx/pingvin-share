import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as mime from "mime-types";
import { join } from "path";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class FileService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService
  ) {}

  async create(file: Express.Multer.File, shareId: string) {
    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
    });

    if (share.uploadLocked)
      throw new BadRequestException("Share is already completed");

    const fileId = randomUUID();

    await fs.promises.mkdir(`./uploads/shares/${shareId}`, { recursive: true });
    fs.promises.rename(
      `./uploads/_temp/${file.filename}`,
      `./uploads/shares/${shareId}/${fileId}`
    );

    return await this.prisma.file.create({
      data: {
        id: fileId,
        name: file.originalname,
        size: file.size.toString(),
        share: { connect: { id: shareId } },
      },
    });
  }

  async get(shareId: string, fileId: string) {
    const fileMetaData = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!fileMetaData) throw new NotFoundException("File not found");

    const file = fs.createReadStream(
      join(process.cwd(), `uploads/shares/${shareId}/${fileId}`)
    );

    return {
      metaData: {
        mimeType: mime.contentType(fileMetaData.name.split(".").pop()),
        ...fileMetaData,
        size: fileMetaData.size,
      },
      file,
    };
  }

  async deleteAllFiles(shareId: string) {
    await fs.promises.rm(`./uploads/shares/${shareId}`, {
      recursive: true,
      force: true,
    });
  }

  getZip(shareId: string) {
    return fs.createReadStream(`./uploads/shares/${shareId}/archive.zip`);
  }

  getFileDownloadUrl(shareId: string, fileId: string) {
    const downloadToken = this.generateFileDownloadToken(shareId, fileId);
    return `${this.config.get(
      "APP_URL"
    )}/api/shares/${shareId}/files/${fileId}?token=${downloadToken}`;
  }

  generateFileDownloadToken(shareId: string, fileId: string) {
    if (fileId == "zip") fileId = undefined;

    return this.jwtService.sign(
      {
        shareId,
        fileId,
      },
      {
        expiresIn: "10min",
        secret: this.config.get("JWT_SECRET"),
      }
    );
  }

  verifyFileDownloadToken(shareId: string, fileId: string, token: string) {
    try {
      const claims = this.jwtService.verify(token, {
        secret: this.config.get("JWT_SECRET"),
      });
      return claims.shareId == shareId && claims.fileId == fileId;
    } catch {
      return false;
    }
  }
}
