export type DiscardReason =
  | "discarded_by_user"
  | "max_track_count_reached"
  | "max_track_count_of_type_reached"
  | "unknown_source_codec"
  | "undecodable_source_codec"
  | "no_encodable_target_codec";

export type DiscardedTrackType = "video" | "audio";

export interface DiscardedTrackInfo {
  type: DiscardedTrackType;
  reason: DiscardReason;
}

const REASON_LABEL: Record<DiscardReason, string> = {
  discarded_by_user: "dropped on request",
  max_track_count_reached: "container can't hold this many tracks",
  max_track_count_of_type_reached: "container doesn't support this track type",
  unknown_source_codec: "source codec is unknown",
  undecodable_source_codec: "source codec can't be decoded in this browser",
  no_encodable_target_codec: "no compatible output codec available in this browser",
};

/**
 * Human-readable error built from mediabunny's `Conversion.discardedTracks`.
 * Used when `Conversion.isValid` is false.
 */
export const parseEncodeError = (
  discarded: ReadonlyArray<DiscardedTrackInfo>,
): string => {
  if (discarded.length === 0) {
    return "Cannot convert this file — no usable video or audio track.";
  }
  const parts = discarded.map(
    (t) => `${t.type} (${REASON_LABEL[t.reason] ?? t.reason})`,
  );
  return `Cannot convert this file: ${parts.join(", ")}.`;
};
