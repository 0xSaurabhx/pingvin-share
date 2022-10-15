import {
  Controller,
  Get,
  Param,
  ParseFilePipeBuilder,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import * as contentDisposition from "content-disposition";
import { Response } from "express";
import { JwtGuard } from "src/auth/guard/jwt.guard";
import { FileDownloadGuard } from "src/file/guard/fileDownload.guard";
import { ShareDTO } from "src/share/dto/share.dto";
import { ShareOwnerGuard } from "src/share/guard/shareOwner.guard";
import { ShareSecurityGuard } from "src/share/guard/shareSecurity.guard";
import { FileService } from "./file.service";

@Controller("shares/:shareId/files")
export class FileController {
  constructor(private fileService: FileService) {}

  @Post()
  @UseGuards(JwtGuard, ShareOwnerGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      dest: "./data/uploads/_temp/",
    })
  )
  async create(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({
          maxSize: parseInt(process.env.MAX_FILE_SIZE),
        })
        .build()
    )
    file: Express.Multer.File,
    @Param("shareId") shareId: string
  ) {
    // Fixes file names with special characters
    file.originalname = Buffer.from(file.originalname, "latin1").toString(
      "utf8"
    );
    return new ShareDTO().from(await this.fileService.create(file, shareId));
  }

  @Get(":fileId/download")
  @UseGuards(ShareSecurityGuard)
  async getFileDownloadUrl(
    @Res({ passthrough: true }) res: Response,
    @Param("shareId") shareId: string,
    @Param("fileId") fileId: string
  ) {
    const url = this.fileService.getFileDownloadUrl(shareId, fileId);

    return { url };
  }

  @Get("zip/download")
  @UseGuards(ShareSecurityGuard)
  async getZipArchiveDownloadURL(
    @Res({ passthrough: true }) res: Response,
    @Param("shareId") shareId: string,
    @Param("fileId") fileId: string
  ) {
    const url = this.fileService.getFileDownloadUrl(shareId, fileId);

    res.set({
      "Content-Type": "application/zip",
    });

    return { url };
  }

  @Get("zip")
  @UseGuards(FileDownloadGuard)
  async getZip(
    @Res({ passthrough: true }) res: Response,
    @Param("shareId") shareId: string
  ) {
    const zip = this.fileService.getZip(shareId);
    res.set({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment ; filename="pingvin-share-${shareId}"`,
    });

    return new StreamableFile(zip);
  }

  @Get(":fileId")
  @UseGuards(FileDownloadGuard)
  async getFile(
    @Res({ passthrough: true }) res: Response,
    @Param("shareId") shareId: string,
    @Param("fileId") fileId: string
  ) {
    const file = await this.fileService.get(shareId, fileId);
    res.set({
      "Content-Type": file.metaData.mimeType,
      "Content-Length": file.metaData.size,
      "Content-Disposition": contentDisposition(file.metaData.name),
    });

    return new StreamableFile(file.file);
  }
}
