import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Share, User } from "@prisma/client";
import * as archiver from "archiver";
import * as argon from "argon2";
import * as fs from "fs";
import * as moment from "moment";
import { FileService } from "src/file/file.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateShareDTO } from "./dto/createShare.dto";

@Injectable()
export class ShareService {
  constructor(
    private prisma: PrismaService,
    private fileService: FileService,
    private config: ConfigService,
    private jwtService: JwtService
  ) {}

  async create(share: CreateShareDTO, user: User) {
    if (!(await this.isShareIdAvailable(share.id)).isAvailable)
      throw new BadRequestException("Share id already in use");

    if (!share.security || Object.keys(share.security).length == 0)
      share.security = undefined;

    if (share.security?.password) {
      share.security.password = await argon.hash(share.security.password);
    }

    const expirationDate = moment()
      .add(
        share.expiration.split("-")[0],
        share.expiration.split("-")[1] as moment.unitOfTime.DurationConstructor
      )
      .toDate();

    // Throw error if expiration date is now
    if (expirationDate.setMilliseconds(0) == new Date().setMilliseconds(0))
      throw new BadRequestException("Invalid expiration date");

    return await this.prisma.share.create({
      data: {
        ...share,
        expiration: expirationDate,
        creator: { connect: { id: user.id } },
        security: { create: share.security },
      },
    });
  }

  async createZip(shareId: string) {
    const path = `./data/uploads/shares/${shareId}`;

    const files = await this.prisma.file.findMany({ where: { shareId } });
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });
    const writeStream = fs.createWriteStream(`${path}/archive.zip`);

    for (const file of files) {
      archive.append(fs.createReadStream(`${path}/${file.id}`), {
        name: file.name,
      });
    }

    archive.pipe(writeStream);
    await archive.finalize();
  }

  async complete(id: string) {
    if (await this.isShareCompleted(id))
      throw new BadRequestException("Share already completed");

    const moreThanOneFileInShare =
      (await this.prisma.file.findMany({ where: { shareId: id } })).length != 0;

    if (!moreThanOneFileInShare)
      throw new BadRequestException(
        "You need at least on file in your share to complete it."
      );

    this.createZip(id).then(() =>
      this.prisma.share.update({ where: { id }, data: { isZipReady: true } })
    );

    return await this.prisma.share.update({
      where: { id },
      data: { uploadLocked: true },
    });
  }

  async getSharesByUser(userId: string) {
    return await this.prisma.share.findMany({
      where: {
        creator: { id: userId },
        expiration: { gt: new Date() },
        uploadLocked: true,
      },
      orderBy: {
        expiration: "desc",
      },
    });
  }

  async get(id: string) {
    const share: any = await this.prisma.share.findUnique({
      where: { id },
      include: {
        files: true,
        creator: true,
      },
    });

    if (!share || !share.uploadLocked)
      throw new NotFoundException("Share not found");

    return share;
  }

  async getMetaData(id: string) {
    const share = await this.prisma.share.findUnique({
      where: { id },
    });

    if (!share || !share.uploadLocked)
      throw new NotFoundException("Share not found");

    return share;
  }

  async remove(shareId: string) {
    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
    });

    if (!share) throw new NotFoundException("Share not found");

    await this.fileService.deleteAllFiles(shareId);
    await this.prisma.share.delete({ where: { id: shareId } });
  }

  async isShareCompleted(id: string) {
    return (await this.prisma.share.findUnique({ where: { id } })).uploadLocked;
  }

  async isShareIdAvailable(id: string) {
    const share = await this.prisma.share.findUnique({ where: { id } });
    return { isAvailable: !share };
  }

  async increaseViewCount(share: Share) {
    await this.prisma.share.update({
      where: { id: share.id },
      data: { views: share.views + 1 },
    });
  }

  async getShareToken(shareId: string, password: string) {
    const share = await this.prisma.share.findFirst({
      where: { id: shareId },
      include: {
        security: true,
      },
    });

    if (
      share?.security?.password &&
      !(await argon.verify(share.security.password, password))
    )
      throw new ForbiddenException("Wrong password");

    const token = await this.generateShareToken(shareId);
    await this.increaseViewCount(share);
    return { token };
  }

  async generateShareToken(shareId: string) {
    const { expiration } = await this.prisma.share.findUnique({
      where: { id: shareId },
    });
    console.log(moment(expiration).diff(new Date(), "seconds"));
    return this.jwtService.sign(
      {
        shareId,
      },
      {
        expiresIn: moment(expiration).diff(new Date(), "seconds") + "s",
        secret: this.config.get("JWT_SECRET"),
      }
    );
  }

  verifyShareToken(shareId: string, token: string) {
    try {
      const claims = this.jwtService.verify(token, {
        secret: this.config.get("JWT_SECRET"),
      });

      return claims.shareId == shareId;
    } catch {
      return false;
    }
  }
}
