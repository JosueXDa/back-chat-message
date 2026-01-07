import { Hono } from "hono";
import { R2Folder, FILE_SIZE_LIMITS, ALLOWED_MIME_TYPES } from "@/lib/r2";
import { UploadService, ParsedFile } from "../services/upload.service";
import { ValidateUploadDto } from "../dtos/validate-upload.dto";
import { authMiddleware, type AuthVariables } from "../../../middlewares/auth.middleware";

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
        private readonly uploadService: UploadService
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
                    return c.json({ error: "No se proporcionó ningún archivo" }, 400);
                }

                const parsedFile = await parseFile(file);
                const result = await this.uploadService.uploadProfileAvatar(parsedFile);

                return c.json({
                    success: true,
                    data: result,
                });
            } catch (error) {
                console.error("Error subiendo avatar de perfil:", error);
                return c.json({ 
                    error: error instanceof Error ? error.message : "Error subiendo archivo" 
                }, 400);
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
                    return c.json({ error: "No se proporcionó ningún archivo" }, 400);
                }

                const parsedFile = await parseFile(file);
                const result = await this.uploadService.uploadProfileBanner(parsedFile);

                return c.json({
                    success: true,
                    data: result,
                });
            } catch (error) {
                console.error("Error subiendo banner de perfil:", error);
                return c.json({ 
                    error: error instanceof Error ? error.message : "Error subiendo archivo" 
                }, 400);
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
                    return c.json({ error: "No se proporcionó ningún archivo" }, 400);
                }

                const parsedFile = await parseFile(file);
                const result = await this.uploadService.uploadChannelIcon(parsedFile);

                return c.json({
                    success: true,
                    data: result,
                });
            } catch (error) {
                console.error("Error subiendo icono de canal:", error);
                return c.json({ 
                    error: error instanceof Error ? error.message : "Error subiendo archivo" 
                }, 400);
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
                    return c.json({ error: "No se proporcionó ningún archivo" }, 400);
                }

                const parsedFile = await parseFile(file);
                const result = await this.uploadService.uploadChannelBanner(parsedFile);

                return c.json({
                    success: true,
                    data: result,
                });
            } catch (error) {
                console.error("Error subiendo banner de canal:", error);
                return c.json({ 
                    error: error instanceof Error ? error.message : "Error subiendo archivo" 
                }, 400);
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
                    return c.json({ error: "No se proporcionó ningún archivo" }, 400);
                }

                const parsedFile = await parseFile(file);
                const result = await this.uploadService.uploadMessageImage(parsedFile);

                return c.json({
                    success: true,
                    data: result,
                });
            } catch (error) {
                console.error("Error subiendo imagen de mensaje:", error);
                return c.json({ 
                    error: error instanceof Error ? error.message : "Error subiendo archivo" 
                }, 400);
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
                    return c.json({ error: "No se proporcionó ningún archivo" }, 400);
                }

                const parsedFile = await parseFile(file);
                const result = await this.uploadService.uploadMessageAttachment(parsedFile);

                return c.json({
                    success: true,
                    data: result,
                });
            } catch (error) {
                console.error("Error subiendo adjunto de mensaje:", error);
                return c.json({ 
                    error: error instanceof Error ? error.message : "Error subiendo archivo" 
                }, 400);
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
                    return c.json({ error: "No se proporcionaron archivos" }, 400);
                }

                if (files.length > 10) {
                    return c.json({ error: "Máximo 10 archivos por solicitud" }, 400);
                }

                const parsedFiles = await parseMultipleFiles(files);
                const results = await this.uploadService.uploadMultipleMessageImages(parsedFiles);

                return c.json({
                    success: true,
                    data: results,
                });
            } catch (error) {
                console.error("Error subiendo múltiples imágenes:", error);
                return c.json({ 
                    error: error instanceof Error ? error.message : "Error subiendo archivos" 
                }, 400);
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
                    return c.json({ error: "No se proporcionaron archivos" }, 400);
                }

                if (files.length > 10) {
                    return c.json({ error: "Máximo 10 archivos por solicitud" }, 400);
                }

                const parsedFiles = await parseMultipleFiles(files);
                const results = await this.uploadService.uploadMultipleMessageAttachments(parsedFiles);

                return c.json({
                    success: true,
                    data: results,
                });
            } catch (error) {
                console.error("Error subiendo múltiples adjuntos:", error);
                return c.json({ 
                    error: error instanceof Error ? error.message : "Error subiendo archivos" 
                }, 400);
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
                    return c.json({ error: "No se proporcionó ningún archivo" }, 400);
                }

                const parsedFile = await parseFile(file);
                const result = await this.uploadService.uploadMessageVideo(parsedFile);

                return c.json({
                    success: true,
                    data: result,
                });
            } catch (error) {
                console.error("Error subiendo video de mensaje:", error);
                return c.json({ 
                    error: error instanceof Error ? error.message : "Error subiendo archivo" 
                }, 400);
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
                    return c.json({ error: "No se proporcionaron archivos" }, 400);
                }

                if (files.length > 5) {
                    return c.json({ error: "Máximo 5 videos por solicitud" }, 400);
                }

                const parsedFiles = await parseMultipleFiles(files);
                const results = await this.uploadService.uploadMultipleMessageVideos(parsedFiles);

                return c.json({
                    success: true,
                    data: results,
                });
            } catch (error) {
                console.error("Error subiendo múltiples videos:", error);
                return c.json({ 
                    error: error instanceof Error ? error.message : "Error subiendo archivos" 
                }, 400);
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
                    return c.json({ error: "No se proporcionó ningún archivo" }, 400);
                }

                const parsedFile = await parseFile(file);
                const result = await this.uploadService.uploadMessageAudio(parsedFile);

                return c.json({
                    success: true,
                    data: result,
                });
            } catch (error) {
                console.error("Error subiendo audio de mensaje:", error);
                return c.json({ 
                    error: error instanceof Error ? error.message : "Error subiendo archivo" 
                }, 400);
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
                    return c.json({ error: "No se proporcionaron archivos" }, 400);
                }

                if (files.length > 5) {
                    return c.json({ error: "Máximo 5 audios por solicitud" }, 400);
                }

                const parsedFiles = await parseMultipleFiles(files);
                const results = await this.uploadService.uploadMultipleMessageAudios(parsedFiles);

                return c.json({
                    success: true,
                    data: results,
                });
            } catch (error) {
                console.error("Error subiendo múltiples audios:", error);
                return c.json({ 
                    error: error instanceof Error ? error.message : "Error subiendo archivos" 
                }, 400);
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
                    return c.json({ error: validation.error.issues }, 400);
                }

                const isValid = await this.uploadService.validateUpload(validation.data);

                return c.json({ valid: isValid });
            } catch (error) {
                console.error("Error validando upload:", error);
                return c.json({ 
                    error: error instanceof Error ? error.message : "Error validando archivo" 
                }, 400);
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
