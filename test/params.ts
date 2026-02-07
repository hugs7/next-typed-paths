/**
 * Define custom types for route parameters
 */
export interface RouteParamTypeMap {
  userId: string;
  postId: number;
  teamId: `team_${string}`;
}
