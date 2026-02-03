import { PROJECT_ID } from "./constants";

export function makeId(path: string): string {
    return `${PROJECT_ID}:${path}`;
}