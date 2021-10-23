import {Image, StyleSheet} from "react-native";
import API from "../common/api";
import React from "react";
import {getThumbnailPath} from "../domain/sync";
import {Tags} from "../common/entity";

export default function Thumbnail(props: { tags: Tags | undefined, local: boolean }) {
    if (!props.tags) {
        return <></>;
    }
    const compressed = props.tags?.get("compressed_thumbnail")?.text;
    let uri;
    if (props.local && compressed) {
        uri = "file://" + getThumbnailPath(compressed);
    } else {
        const thumbnail = compressed || (props.tags?.get("thumbnail")?.text || "");
        if (thumbnail === "") {
            return <></>;
        }
        uri = API.getAPIUrl() + "/storage/" + thumbnail;
    }
    return <Image style={styles.thumbnail}
                  source={{uri: uri}}
                  width={60} height={60}/>;
}

const styles = StyleSheet.create({
    thumbnail: {
        flexBasis: 60,
        height: 60,
    }
});