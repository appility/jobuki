const SHORT_HANDLE_LENGTH = 10

export function toPublicProfileHandle(profileId: string) {
  return profileId.slice(0, SHORT_HANDLE_LENGTH)
}
