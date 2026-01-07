import { Hono } from "hono";
import { R2Folder, FILE_SIZE_LIMITS, ALLOWED_MIME_TYPES } from "@/lib/r2";
import { IUploadsService, ParsedFile } from "../services/upload.service";
import { ValidateUploadDto } from "../dtos/validate-upload.dto";
import { authMiddleware, type AuthVariables } from "@/middlewares/auth.middleware";
import { toHTTPException, NoFileProvidedError, MultipleFilesLimitError } from "../errors/upload.errors";

const parseFile = async (file: File): Promise<ParsedFile> => {
    const arrayBuffer = await file.arrayBuffer();
    return {
        arrayBuffer,
        name: file.name,
        type: file.type,
        size: file.size,
    };
};

const parseMultipleFiles = async (files: File[]): Promise<ParsedFile[]> => {
    return Promise.all(files.map(parseFile));
};

export class UploadController {
    public readonly router: Hono<{ Variables: AuthVariables }>;

    constructor(
        private readonly uploadService: IUploadsService
    ) {
        this.router = new Hono<{ Variables: AuthVariables }>();
        this.registerRoutes();
    }

    private registerRoutes() {
        this.router.use("/*", authMiddleware);
        /**
         * Sube un avatar de perfil
         * POST /uploads/profile/avatar
         * Body: FormData con campo "file"
         */
        this.router.post("/profile/avatar", async (c) => {
            try {
                const formData = await c.req.formData();
                const file = formData.get("file") as File | null;

                if (!file) {
                    throw new NoFileProvidedError();
                }

                const parsedFile = await parseFile(file);
                const result = await this.uploadService.uploadProfileAvatar(parsedFile);

                return c.json({
                    success: true,
                    data: result,
                });
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        /**
         * Sube un banner de perfil
         * POST /uploads/profile/banner
         * Body: FormData con campo "file"
         */
        this.router.post("/profile/banner", async (c) => {
            try {
                const formData = await c.req.formData();
                const file = formData.get("file") as File | null;

                if (!file) {
                    throw new NoFileProvidedError();
                }

                const parsedFile = await parseFile(file);
                const result = await this.uploadService.uploadProfileBanner(parsedFile);

                return c.json({
                    success: true,
                    data: result,
                });
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        // ========== CHANNEL UPLOADS ==========

        /**
         * Sube un icono de canal
         * POST /uploads/channel/icon
         * Body: FormData con campo "file"
         */
        this.router.post("/channel/icon", async (c) => {
            try {
                const formData = await c.req.formData();
                const file = formData.get("file") as File | null;

                if (!file) {
                    throw new NoFileProvidedError();
                }

                const parsedFile = await parseFile(file);
                const result = await this.uploadService.uploadChannelIcon(parsedFile);

                return c.json({
                    success: true,
                    data: result,
                });
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        /**
         * Sube un banner de canal
         * POST /uploads/channel/banner
         * Body: FormData con campo "file"
         */
        this.router.post("/channel/banner", async (c) => {
            try {
                const formData = await c.req.formData();
                const file = formData.get("file") as File | null;

                if (!file) {
                    throw new NoFileProvidedError();
                }

                const parsedFile = await parseFile(file);
                const result = await this.uploadService.uploadChannelBanner(parsedFile);

                return c.json({
                    success: true,
                    data: result,
                });
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        // ========== MESSAGE UPLOADS ==========

        /**
         * Sube una imagen de mensaje
         * POST /uploads/message/image
         * Body: FormData con campo "file"
         */
        this.router.post("/message/image", async (c) => {
            try {
                const formData = await c.req.formData();
                const file = formData.get("file") as File | null;

                if (!file) {
                    throw new NoFileProvidedError();
                }

                const parsedFile = await parseFile(file);
                const result = await this.uploadService.uploadMessageImage(parsedFile);

                return c.json({
                    success: true,
                    data: result,
                });
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        /**
         * Sube un adjunto de mensaje (documentos, imágenes, etc.)
         * POST /uploads/message/attachment
         * Body: FormData con campo "file"
         */
        this.router.post("/message/attachment", async (c) => {
            try {
                const formData = await c.req.formData();
                const file = formData.get("file") as File | null;

                if (!file) {
                    throw new NoFileProvidedError();
                }

                const parsedFile = await parseFile(file);
                const result = await this.uploadService.uploadMessageAttachment(parsedFile);

                return c.json({
                    success: true,
                    data: result,
                });
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        /**
         * Sube múltiples imágenes de mensaje (hasta 10)
         * POST /uploads/message/images
         * Body: FormData con campo "files" (múltiples archivos)
         */
        this.router.post("/message/images", async (c) => {
            try {
                const formData = await c.req.formData();
                const files = formData.getAll("files") as File[];

                if (!files || files.length === 0) {
                    throw new NoFileProvidedError();
                }

                if (files.length > 10) {
                    throw new MultipleFilesLimitError(files.length, 10);
                }

                const parsedFiles = await parseMultipleFiles(files);
                const results = await this.uploadService.uploadMultipleMessageImages(parsedFiles);

                return c.json({
                    success: true,
                    data: results,
                });
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        /**
         * Sube múltiples adjuntos de mensaje (hasta 10)
         * POST /uploads/message/attachments
         * Body: FormData con campo "files" (múltiples archivos)
         */
        this.router.post("/message/attachments", async (c) => {
            try {
                const formData = await c.req.formData();
                const files = formData.getAll("files") as File[];
                if (!files || files.length === 0) {
                    throw new NoFileProvidedError();
                }

                if (files.length > 10) {
                    throw new MultipleFilesLimitError(files.length, 10);
                }

                const parsedFiles = await parseMultipleFiles(files);
                const results = await this.uploadService.uploadMultipleMessageAttachments(parsedFiles);

                return c.json({
                    success: true,
                    data: results,
                });
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        /**
         * Sube un video de mensaje
         * POST /uploads/message/video
         * Body: FormData con campo "file"
         */
        this.router.post("/message/video", async (c) => {
            try {
                const formData = await c.req.formData();
                const file = formData.get("file") as File | null;

                if (!file) {
                    throw new NoFileProvidedError();
                }

                const parsedFile = await parseFile(file);
                const result = await this.uploadService.uploadMessageVideo(parsedFile);

                return c.json({
                    success: true,
                    data: result,
                });
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        /**
         * Sube múltiples videos de mensaje (hasta 5)
         * POST /uploads/message/videos
         * Body: FormData con campo "files" (múltiples archivos)
         */
        this.router.post("/message/videos", async (c) => {
            try {
                const formData = await c.req.formData();
                const files = formData.getAll("files") as File[];

                if (!files || files.length === 0) {
                    throw new NoFileProvidedError();
                }

                if (files.length > 5) {
                    throw new MultipleFilesLimitError(files.length, 5);
                }

                const parsedFiles = await parseMultipleFiles(files);
                const results = await this.uploadService.uploadMultipleMessageVideos(parsedFiles);

                return c.json({
                    success: true,
                    data: results,
                });
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        /**
         * Sube un audio de mensaje
         * POST /uploads/message/audio
         * Body: FormData con campo "file"
         */
        this.router.post("/message/audio", async (c) => {
            try {
                const formData = await c.req.formData();
                const file = formData.get("file") as File | null;

                if (!file) {
                    throw new NoFileProvidedError();
                }

                const parsedFile = await parseFile(file);
                const result = await this.uploadService.uploadMessageAudio(parsedFile);

                return c.json({
                    success: true,
                    data: result,
                });
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        /**
         * Sube múltiples audios de mensaje (hasta 5)
         * POST /uploads/message/audios
         * Body: FormData con campo "files" (múltiples archivos)
         */
        this.router.post("/message/audios", async (c) => {
            try {
                const formData = await c.req.formData();
                const files = formData.getAll("files") as File[];

                if (!files || files.length === 0) {
                    throw new NoFileProvidedError();
                }

                if (files.length > 5) {
                    throw new MultipleFilesLimitError(files.length, 5);
                }

                const parsedFiles = await parseMultipleFiles(files);
                const results = await this.uploadService.uploadMultipleMessageAudios(parsedFiles);

                return c.json({
                    success: true,
                    data: results,
                });
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        // ========== VALIDACIÓN Y UTILIDADES ==========

        /**
         * Valida que un archivo existe en R2
         * POST /uploads/validate
         * Body: { fileKey: string, publicUrl: string }
         */
        this.router.post("/validate", async (c) => {
            try {
                const body = await c.req.json();
                const validation = ValidateUploadDto.safeParse(body);

                if (!validation.success) {
                    throw validation.error;
                }

                const isValid = await this.uploadService.validateUpload(validation.data);

                return c.json({ valid: isValid });
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        /**
         * Obtiene información sobre los límites y tipos permitidos
         * GET /uploads/info
         */
        this.router.get("/info", async (c) => {
            return c.json({
                limits: {
                    image: {
                        maxSize: FILE_SIZE_LIMITS.IMAGE,
                        maxSizeMB: FILE_SIZE_LIMITS.IMAGE / (1024 * 1024),
                        allowedTypes: ALLOWED_MIME_TYPES.IMAGES,
                    },
                    document: {
                        maxSize: FILE_SIZE_LIMITS.DOCUMENT,
                        maxSizeMB: FILE_SIZE_LIMITS.DOCUMENT / (1024 * 1024),
                        allowedTypes: ALLOWED_MIME_TYPES.DOCUMENTS,
                    },
                    profile: {
                        maxSize: FILE_SIZE_LIMITS.PROFILE,
                        maxSizeMB: FILE_SIZE_LIMITS.PROFILE / (1024 * 1024),
                        allowedTypes: ALLOWED_MIME_TYPES.IMAGES,
                    },
                    video: {
                        maxSize: FILE_SIZE_LIMITS.VIDEO,
                        maxSizeMB: FILE_SIZE_LIMITS.VIDEO / (1024 * 1024),
                        allowedTypes: ALLOWED_MIME_TYPES.VIDEOS,
                    },
                    audio: {
                        maxSize: FILE_SIZE_LIMITS.AUDIO,
                        maxSizeMB: FILE_SIZE_LIMITS.AUDIO / (1024 * 1024),
                        allowedTypes: ALLOWED_MIME_TYPES.AUDIOS,
                    },
                    attachment: {
                        maxSize: FILE_SIZE_LIMITS.DOCUMENT,
                        maxSizeMB: FILE_SIZE_LIMITS.DOCUMENT / (1024 * 1024),
                        allowedTypes: ALLOWED_MIME_TYPES.ALL_ATTACHMENTS,
                    },
                },
                maxFilesPerRequest: {
                    images: 10,
                    attachments: 10,
                    videos: 5,
                    audios: 5,
                },
            });
        });
    }
}
