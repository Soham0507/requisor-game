import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { ApiError, BoothStats, BrandingDraft, CreateCustomUiRequestRequest, CreatePlayerSubmissionRequest, CustomUiRequest, FinalizeBrandingDraftRequest, Game, Generation, GenerationInput, HealthStatus, ListBasketballScoresParams, ListGenerationsParams, ListSoccerScoresParams, Order, PlayerSubmission, SavedGameContent, Scene, SoccerScore, SoccerScoreInput, UpsertBrandingDraftRequest } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getListBasketballScoresUrl: (params?: ListBasketballScoresParams) => string;
/**
 * @summary Public Basketball Shootout leaderboard (no email addresses)
 */
export declare const listBasketballScores: (params?: ListBasketballScoresParams, options?: Parameters<typeof customFetch>[1]) => Promise<SoccerScore[]>;
export declare const getListBasketballScoresQueryKey: (params?: ListBasketballScoresParams) => readonly ["/api/games/basketball-shootout/scores", ...ListBasketballScoresParams[]];
export declare const getListBasketballScoresQueryOptions: <TData = Awaited<ReturnType<typeof listBasketballScores>>, TError = ErrorType<void>>(params?: ListBasketballScoresParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBasketballScores>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listBasketballScores>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListBasketballScoresQueryResult = NonNullable<Awaited<ReturnType<typeof listBasketballScores>>>;
export type ListBasketballScoresQueryError = ErrorType<void>;
/**
 * @summary Public Basketball Shootout leaderboard (no email addresses)
 */
export declare function useListBasketballScores<TData = Awaited<ReturnType<typeof listBasketballScores>>, TError = ErrorType<void>>(params?: ListBasketballScoresParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBasketballScores>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getSubmitBasketballScoreUrl: () => string;
/**
 * @summary Save a basketball result; repeated submission IDs are idempotent
 */
export declare const submitBasketballScore: (soccerScoreInput: SoccerScoreInput, options?: Parameters<typeof customFetch>[1]) => Promise<SoccerScore>;
export declare const getSubmitBasketballScoreMutationKey: () => readonly ["submitBasketballScore"];
export declare const getSubmitBasketballScoreMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof submitBasketballScore>>, TError, SubmitBasketballScoreMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof submitBasketballScore>>, TError, SubmitBasketballScoreMutationVariables, TContext>;
export type SubmitBasketballScoreMutationResult = NonNullable<Awaited<ReturnType<typeof submitBasketballScore>>>;
export type SubmitBasketballScoreMutationBody = BodyType<SoccerScoreInput>;
export type SubmitBasketballScoreMutationError = ErrorType<void>;
export type SubmitBasketballScoreMutationVariables = {
    data: BodyType<SoccerScoreInput>;
};
/**
* @summary Save a basketball result; repeated submission IDs are idempotent
*/
export declare const useSubmitBasketballScore: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof submitBasketballScore>>, TError, SubmitBasketballScoreMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof submitBasketballScore>>, TError, SubmitBasketballScoreMutationVariables, TContext>;
export declare const getListSoccerScoresUrl: (params?: ListSoccerScoresParams) => string;
/**
 * @summary Public Soccer Shootout leaderboard (no email addresses)
 */
export declare const listSoccerScores: (params?: ListSoccerScoresParams, options?: Parameters<typeof customFetch>[1]) => Promise<SoccerScore[]>;
export declare const getListSoccerScoresQueryKey: (params?: ListSoccerScoresParams) => readonly ["/api/games/soccer-shootout/scores", ...ListSoccerScoresParams[]];
export declare const getListSoccerScoresQueryOptions: <TData = Awaited<ReturnType<typeof listSoccerScores>>, TError = ErrorType<void>>(params?: ListSoccerScoresParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSoccerScores>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSoccerScores>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSoccerScoresQueryResult = NonNullable<Awaited<ReturnType<typeof listSoccerScores>>>;
export type ListSoccerScoresQueryError = ErrorType<void>;
/**
 * @summary Public Soccer Shootout leaderboard (no email addresses)
 */
export declare function useListSoccerScores<TData = Awaited<ReturnType<typeof listSoccerScores>>, TError = ErrorType<void>>(params?: ListSoccerScoresParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSoccerScores>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getSubmitSoccerScoreUrl: () => string;
/**
 * @summary Save a soccer result; repeated submission IDs are idempotent
 */
export declare const submitSoccerScore: (soccerScoreInput: SoccerScoreInput, options?: Parameters<typeof customFetch>[1]) => Promise<SoccerScore>;
export declare const getSubmitSoccerScoreMutationKey: () => readonly ["submitSoccerScore"];
export declare const getSubmitSoccerScoreMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof submitSoccerScore>>, TError, SubmitSoccerScoreMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof submitSoccerScore>>, TError, SubmitSoccerScoreMutationVariables, TContext>;
export type SubmitSoccerScoreMutationResult = NonNullable<Awaited<ReturnType<typeof submitSoccerScore>>>;
export type SubmitSoccerScoreMutationBody = BodyType<SoccerScoreInput>;
export type SubmitSoccerScoreMutationError = ErrorType<void>;
export type SubmitSoccerScoreMutationVariables = {
    data: BodyType<SoccerScoreInput>;
};
/**
* @summary Save a soccer result; repeated submission IDs are idempotent
*/
export declare const useSubmitSoccerScore: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof submitSoccerScore>>, TError, SubmitSoccerScoreMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof submitSoccerScore>>, TError, SubmitSoccerScoreMutationVariables, TContext>;
export declare const getHealthCheckUrl: () => string;
/**
 * Returns server health status
 * @summary Health check
 */
export declare const healthCheck: (options?: Parameters<typeof customFetch>[1]) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListGamesUrl: () => string;
/**
 * @summary List the brandable game catalog
 */
export declare const listGames: (options?: Parameters<typeof customFetch>[1]) => Promise<Game[]>;
export declare const getListGamesQueryKey: () => readonly ["/api/games"];
export declare const getListGamesQueryOptions: <TData = Awaited<ReturnType<typeof listGames>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listGames>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listGames>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListGamesQueryResult = NonNullable<Awaited<ReturnType<typeof listGames>>>;
export type ListGamesQueryError = ErrorType<unknown>;
/**
 * @summary List the brandable game catalog
 */
export declare function useListGames<TData = Awaited<ReturnType<typeof listGames>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listGames>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetGameUrl: (slug: string) => string;
/**
 * @summary Get a single game by slug
 */
export declare const getGame: (slug: string, options?: Parameters<typeof customFetch>[1]) => Promise<Game>;
export declare const getGetGameQueryKey: (slug: string) => readonly [`/api/games/${string}`];
export declare const getGetGameQueryOptions: <TData = Awaited<ReturnType<typeof getGame>>, TError = ErrorType<void>>(slug: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGame>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getGame>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetGameQueryResult = NonNullable<Awaited<ReturnType<typeof getGame>>>;
export type GetGameQueryError = ErrorType<void>;
/**
 * @summary Get a single game by slug
 */
export declare function useGetGame<TData = Awaited<ReturnType<typeof getGame>>, TError = ErrorType<void>>(slug: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGame>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpsertBrandingDraftUrl: () => string;
/**
 * Upserts by the combination of gameId + draftToken
 * @summary Create or update a branding draft for a game
 */
export declare const upsertBrandingDraft: (upsertBrandingDraftRequest: UpsertBrandingDraftRequest, options?: Parameters<typeof customFetch>[1]) => Promise<BrandingDraft>;
export declare const getUpsertBrandingDraftMutationKey: () => readonly ["upsertBrandingDraft"];
export declare const getUpsertBrandingDraftMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof upsertBrandingDraft>>, TError, UpsertBrandingDraftMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof upsertBrandingDraft>>, TError, UpsertBrandingDraftMutationVariables, TContext>;
export type UpsertBrandingDraftMutationResult = NonNullable<Awaited<ReturnType<typeof upsertBrandingDraft>>>;
export type UpsertBrandingDraftMutationBody = BodyType<UpsertBrandingDraftRequest>;
export type UpsertBrandingDraftMutationError = ErrorType<unknown>;
export type UpsertBrandingDraftMutationVariables = {
    data: BodyType<UpsertBrandingDraftRequest>;
};
/**
* @summary Create or update a branding draft for a game
*/
export declare const useUpsertBrandingDraft: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof upsertBrandingDraft>>, TError, UpsertBrandingDraftMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof upsertBrandingDraft>>, TError, UpsertBrandingDraftMutationVariables, TContext>;
export declare const getGetBrandingDraftUrl: (id: string) => string;
/**
 * @summary Get a branding draft by id
 */
export declare const getBrandingDraft: (id: string, options?: Parameters<typeof customFetch>[1]) => Promise<BrandingDraft>;
export declare const getGetBrandingDraftQueryKey: (id: string) => readonly [`/api/branding-drafts/${string}`];
export declare const getGetBrandingDraftQueryOptions: <TData = Awaited<ReturnType<typeof getBrandingDraft>>, TError = ErrorType<void>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBrandingDraft>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBrandingDraft>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBrandingDraftQueryResult = NonNullable<Awaited<ReturnType<typeof getBrandingDraft>>>;
export type GetBrandingDraftQueryError = ErrorType<void>;
/**
 * @summary Get a branding draft by id
 */
export declare function useGetBrandingDraft<TData = Awaited<ReturnType<typeof getBrandingDraft>>, TError = ErrorType<void>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBrandingDraft>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetBrandingDraftContentUrl: (id: string) => string;
export declare const getBrandingDraftContent: (id: string, options?: Parameters<typeof customFetch>[1]) => Promise<SavedGameContent>;
export declare const getGetBrandingDraftContentQueryKey: (id: string) => readonly [`/api/branding-drafts/${string}/content`];
export declare const getGetBrandingDraftContentQueryOptions: <TData = Awaited<ReturnType<typeof getBrandingDraftContent>>, TError = ErrorType<void>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBrandingDraftContent>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBrandingDraftContent>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBrandingDraftContentQueryResult = NonNullable<Awaited<ReturnType<typeof getBrandingDraftContent>>>;
export type GetBrandingDraftContentQueryError = ErrorType<void>;
export declare function useGetBrandingDraftContent<TData = Awaited<ReturnType<typeof getBrandingDraftContent>>, TError = ErrorType<void>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBrandingDraftContent>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getFinalizeBrandingDraftUrl: (id: string) => string;
/**
 * @summary Finalize a branding draft and create a pending order
 */
export declare const finalizeBrandingDraft: (id: string, finalizeBrandingDraftRequest?: FinalizeBrandingDraftRequest, options?: Parameters<typeof customFetch>[1]) => Promise<Order>;
export declare const getFinalizeBrandingDraftMutationKey: () => readonly ["finalizeBrandingDraft"];
export declare const getFinalizeBrandingDraftMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof finalizeBrandingDraft>>, TError, FinalizeBrandingDraftMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof finalizeBrandingDraft>>, TError, FinalizeBrandingDraftMutationVariables, TContext>;
export type FinalizeBrandingDraftMutationResult = NonNullable<Awaited<ReturnType<typeof finalizeBrandingDraft>>>;
export type FinalizeBrandingDraftMutationBody = BodyType<FinalizeBrandingDraftRequest> | undefined;
export type FinalizeBrandingDraftMutationError = ErrorType<void>;
export type FinalizeBrandingDraftMutationVariables = {
    id: string;
    data?: BodyType<FinalizeBrandingDraftRequest>;
};
/**
* @summary Finalize a branding draft and create a pending order
*/
export declare const useFinalizeBrandingDraft: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof finalizeBrandingDraft>>, TError, FinalizeBrandingDraftMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof finalizeBrandingDraft>>, TError, FinalizeBrandingDraftMutationVariables, TContext>;
export declare const getCreateCustomUiRequestUrl: () => string;
/**
 * @summary Submit a request for a fully custom UI build
 */
export declare const createCustomUiRequest: (createCustomUiRequestRequest: CreateCustomUiRequestRequest, options?: Parameters<typeof customFetch>[1]) => Promise<CustomUiRequest>;
export declare const getCreateCustomUiRequestMutationKey: () => readonly ["createCustomUiRequest"];
export declare const getCreateCustomUiRequestMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCustomUiRequest>>, TError, CreateCustomUiRequestMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createCustomUiRequest>>, TError, CreateCustomUiRequestMutationVariables, TContext>;
export type CreateCustomUiRequestMutationResult = NonNullable<Awaited<ReturnType<typeof createCustomUiRequest>>>;
export type CreateCustomUiRequestMutationBody = BodyType<CreateCustomUiRequestRequest>;
export type CreateCustomUiRequestMutationError = ErrorType<unknown>;
export type CreateCustomUiRequestMutationVariables = {
    data: BodyType<CreateCustomUiRequestRequest>;
};
/**
* @summary Submit a request for a fully custom UI build
*/
export declare const useCreateCustomUiRequest: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCustomUiRequest>>, TError, CreateCustomUiRequestMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createCustomUiRequest>>, TError, CreateCustomUiRequestMutationVariables, TContext>;
export declare const getCreatePlayerSubmissionUrl: () => string;
/**
 * Resolves gameSlug to the game's id server-side — the embedded game knows its own slug, not the row's database id
 * @summary Submit player info captured at game-over
 */
export declare const createPlayerSubmission: (createPlayerSubmissionRequest: CreatePlayerSubmissionRequest, options?: Parameters<typeof customFetch>[1]) => Promise<PlayerSubmission>;
export declare const getCreatePlayerSubmissionMutationKey: () => readonly ["createPlayerSubmission"];
export declare const getCreatePlayerSubmissionMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPlayerSubmission>>, TError, CreatePlayerSubmissionMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createPlayerSubmission>>, TError, CreatePlayerSubmissionMutationVariables, TContext>;
export type CreatePlayerSubmissionMutationResult = NonNullable<Awaited<ReturnType<typeof createPlayerSubmission>>>;
export type CreatePlayerSubmissionMutationBody = BodyType<CreatePlayerSubmissionRequest>;
export type CreatePlayerSubmissionMutationError = ErrorType<void>;
export type CreatePlayerSubmissionMutationVariables = {
    data: BodyType<CreatePlayerSubmissionRequest>;
};
/**
* @summary Submit player info captured at game-over
*/
export declare const useCreatePlayerSubmission: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPlayerSubmission>>, TError, CreatePlayerSubmissionMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createPlayerSubmission>>, TError, CreatePlayerSubmissionMutationVariables, TContext>;
export declare const getListScenesUrl: () => string;
/**
 * Returns the available boat experiences a visitor can choose from
 * @summary List boat experiences
 */
export declare const listScenes: (options?: Parameters<typeof customFetch>[1]) => Promise<Scene[]>;
export declare const getListScenesQueryKey: () => readonly ["/api/scenes"];
export declare const getListScenesQueryOptions: <TData = Awaited<ReturnType<typeof listScenes>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listScenes>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listScenes>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListScenesQueryResult = NonNullable<Awaited<ReturnType<typeof listScenes>>>;
export type ListScenesQueryError = ErrorType<unknown>;
/**
 * @summary List boat experiences
 */
export declare function useListScenes<TData = Awaited<ReturnType<typeof listScenes>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listScenes>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListGenerationsUrl: (params?: ListGenerationsParams) => string;
/**
 * Returns the most recent booth creations for the live gallery
 * @summary Recent creations
 */
export declare const listGenerations: (params?: ListGenerationsParams, options?: Parameters<typeof customFetch>[1]) => Promise<Generation[]>;
export declare const getListGenerationsQueryKey: (params?: ListGenerationsParams) => readonly ["/api/generations", ...ListGenerationsParams[]];
export declare const getListGenerationsQueryOptions: <TData = Awaited<ReturnType<typeof listGenerations>>, TError = ErrorType<unknown>>(params?: ListGenerationsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listGenerations>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listGenerations>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListGenerationsQueryResult = NonNullable<Awaited<ReturnType<typeof listGenerations>>>;
export type ListGenerationsQueryError = ErrorType<unknown>;
/**
 * @summary Recent creations
 */
export declare function useListGenerations<TData = Awaited<ReturnType<typeof listGenerations>>, TError = ErrorType<unknown>>(params?: ListGenerationsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listGenerations>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateGenerationUrl: () => string;
/**
 * Takes the visitor's captured photo and a chosen scene, then generates a photoreal image of them enjoying that boat
 * @summary Create a photo from a visitor snapshot
 */
export declare const createGeneration: (generationInput: GenerationInput, options?: Parameters<typeof customFetch>[1]) => Promise<Generation>;
export declare const getCreateGenerationMutationKey: () => readonly ["createGeneration"];
export declare const getCreateGenerationMutationOptions: <TError = ErrorType<ApiError>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createGeneration>>, TError, CreateGenerationMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createGeneration>>, TError, CreateGenerationMutationVariables, TContext>;
export type CreateGenerationMutationResult = NonNullable<Awaited<ReturnType<typeof createGeneration>>>;
export type CreateGenerationMutationBody = BodyType<GenerationInput>;
export type CreateGenerationMutationError = ErrorType<ApiError>;
export type CreateGenerationMutationVariables = {
    data: BodyType<GenerationInput>;
};
/**
* @summary Create a photo from a visitor snapshot
*/
export declare const useCreateGeneration: <TError = ErrorType<ApiError>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createGeneration>>, TError, CreateGenerationMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createGeneration>>, TError, CreateGenerationMutationVariables, TContext>;
export declare const getGetGenerationUrl: (id: string) => string;
/**
 * Returns the current status, photo, and video for a generation
 * @summary Get a generation
 */
export declare const getGeneration: (id: string, options?: Parameters<typeof customFetch>[1]) => Promise<Generation>;
export declare const getGetGenerationQueryKey: (id: string) => readonly [`/api/generations/${string}`];
export declare const getGetGenerationQueryOptions: <TData = Awaited<ReturnType<typeof getGeneration>>, TError = ErrorType<ApiError>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGeneration>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getGeneration>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetGenerationQueryResult = NonNullable<Awaited<ReturnType<typeof getGeneration>>>;
export type GetGenerationQueryError = ErrorType<ApiError>;
/**
 * @summary Get a generation
 */
export declare function useGetGeneration<TData = Awaited<ReturnType<typeof getGeneration>>, TError = ErrorType<ApiError>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGeneration>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getStartVideoUrl: (id: string) => string;
/**
 * Kicks off image-to-video generation for an existing photo generation
 * @summary Animate a generated photo into a video
 */
export declare const startVideo: (id: string, options?: Parameters<typeof customFetch>[1]) => Promise<Generation>;
export declare const getStartVideoMutationKey: () => readonly ["startVideo"];
export declare const getStartVideoMutationOptions: <TError = ErrorType<ApiError>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof startVideo>>, TError, StartVideoMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof startVideo>>, TError, StartVideoMutationVariables, TContext>;
export type StartVideoMutationResult = NonNullable<Awaited<ReturnType<typeof startVideo>>>;
export type StartVideoMutationError = ErrorType<ApiError>;
export type StartVideoMutationVariables = {
    id: string;
};
/**
* @summary Animate a generated photo into a video
*/
export declare const useStartVideo: <TError = ErrorType<ApiError>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof startVideo>>, TError, StartVideoMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof startVideo>>, TError, StartVideoMutationVariables, TContext>;
export declare const getGetBoothStatsUrl: () => string;
/**
 * Aggregate counts for the booth dashboard
 * @summary Booth stats
 */
export declare const getBoothStats: (options?: Parameters<typeof customFetch>[1]) => Promise<BoothStats>;
export declare const getGetBoothStatsQueryKey: () => readonly ["/api/booth/stats"];
export declare const getGetBoothStatsQueryOptions: <TData = Awaited<ReturnType<typeof getBoothStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBoothStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBoothStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBoothStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getBoothStats>>>;
export type GetBoothStatsQueryError = ErrorType<unknown>;
/**
 * @summary Booth stats
 */
export declare function useGetBoothStats<TData = Awaited<ReturnType<typeof getBoothStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBoothStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map