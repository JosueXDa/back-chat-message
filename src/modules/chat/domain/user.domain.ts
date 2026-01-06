/**
 * Domain entity for User
 * 
 * Esta entidad de dominio representa al usuario en el contexto del módulo de chat.
 * NO debe depender de la implementación de la base de datos ni del ORM.
 * 
 * Principio: Inversión de Dependencias (Clean Architecture)
 * - Las capas externas (Gateway, Controllers) dependen de abstracciones del dominio
 * - El dominio NO depende de infraestructura (DB schemas, ORMs)
 */
export interface User {
    /** Identificador único del usuario */
    id: string;
    
    /** Nombre del usuario */
    name: string;
    
    /** Email del usuario */
    email: string;
    
    /** Indica si el email ha sido verificado */
    emailVerified: boolean;
    
    /** URL de la imagen de perfil (opcional) */
    image?: string | null;
    
    /** Fecha de creación de la cuenta */
    createdAt: Date;
    
    /** Fecha de última actualización */
    updatedAt: Date;
}

/**
 * Versión mínima de User con solo los campos esenciales
 * Útil para contextos donde solo se necesita identificación básica
 */
export interface UserIdentity {
    id: string;
    name: string;
    email: string;
}
