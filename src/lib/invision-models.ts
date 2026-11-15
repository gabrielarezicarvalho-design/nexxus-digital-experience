// Shared public names for listing and delivery; provider IDs never enter client catalogs.
export const INVISION_MODEL_ALIASES: Record<string, string> = {
  'claude-opus-5-5': 'openai/gpt-6-luna-invision',
  'claude-sonnet-5': 'anthropic/claude-haiku-5.5',
  'claude-fable-5.1': 'deepseek/deepseek-v4-flash',
};

export function invisionPublicModels(availableModels: string[]): string[] {
  return Object.entries(INVISION_MODEL_ALIASES)
    .filter(([, internalModel]) => availableModels.includes(internalModel))
    .map(([publicModel]) => publicModel);
}