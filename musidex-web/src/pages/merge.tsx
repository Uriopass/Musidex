import './merge.css'
import React, {useContext, useMemo, useState} from "react";
import {PageProps} from "./navigator";
import {MetadataCtx} from "../domain/metadata";
import {NextTrackCallback} from '../common/tracklist';
import {neuralScore} from '../common/filters';
import {MusidexMetadata} from '../common/entity';
import {Thumbnail} from './explorer';
import {timeFormat} from '../common/utils';
import API from '../common/api';

export interface MergeProps extends PageProps {
    doNext: NextTrackCallback;
}

const Merge = (props: MergeProps) => {
    const [meta, metaSync] = useContext(MetadataCtx);
    const [displaySimilarity, setDisplaySimilarity] = useState(0.99);
    const [similarity, setSimilarity] = useState(0.99);

    const duplicates = useMemo(() => {
        if (props.hidden) {
            return [];
        }
        let dups: [number, number, number][] = [];
        for (let i = 0; i < meta.musics.length; i++) {
            let m1 = meta.musics[i] || 0;
            // @ts-ignore
            let v1 = meta.embeddings.get(m1);
            if (v1 === undefined) {
                continue;
            }
            let duration = meta.music_tags_idx.get(m1)?.get("duration")?.integer;
            if (duration === undefined) {
                continue;
            }
            for (let j = i + 1; j < meta.musics.length; j++) {
                let m2 = meta.musics[j] || 0;
                // @ts-ignore
                let s = neuralScore(v1, m2, meta);
                if (s === undefined) {
                    continue;
                }
                let duration2 = meta.music_tags_idx.get(m2)?.get("duration")?.integer;
                if (duration2 === undefined) {
                    continue;
                }
                if (s > similarity && Math.abs(duration - duration2) <= 15) {
                    // @ts-ignore
                    dups.push([m1, m2, s]);
                }
            }
        }
        dups.sort((a, b) => b[2] - a[2]);
        return dups;
    }, [meta, similarity, props.hidden]);

    return (
        <div className={"merge " + (props.hidden ? " hidden" : "")}>
            <div className="title color-fg">Merge similar tracks</div>
            <div className="similarity-container">
                <span className="">Similarity</span>
                <input type="range"
                       min={0.97} max={0.999} step={0.001}
                       value={displaySimilarity}
                       onChange={e => setDisplaySimilarity(e.target.valueAsNumber)}
                       onBlur={e => setSimilarity(e.target.valueAsNumber)}
                />
                <span className="color-fg">{displaySimilarity}</span>
            </div>
            <div className="duplicates">
                {
                    duplicates.map(([m1, m2]) => <DuplicateElement
                        key={m1 + "|" + m2}
                        meta={meta} m1={m1} m2={m2}
                        doNext={props.doNext}
                        onMerge={(m1, m2) => {
                            API.merge(m1, m2).then(() => {
                                metaSync();
                            })
                        }}
                    />)
                }
            </div>
        </div>)
}

const DuplicateElement = (props: {
    meta: MusidexMetadata,
    m1: number,
    m2: number,
    doNext: NextTrackCallback,
    onMerge(m1: number, m2: number): void,
}) => {
    let tags1 = props.meta.music_tags_idx.get(props.m1);
    let tags2 = props.meta.music_tags_idx.get(props.m2);

    let [merge1Disabled, setMerge1Disabled] = useState(false);
    let [merge2Disabled, setMerge2Disabled] = useState(false);

    let cover1 = tags1?.get("compressed_thumbnail")?.text || tags1?.get("thumbnail")?.text;
    let cover2 = tags2?.get("compressed_thumbnail")?.text || tags2?.get("thumbnail")?.text;

    let duration1 = tags1?.get("duration")?.integer || 0;
    let duration2 = tags2?.get("duration")?.integer || 0;

    return (
        <div className="duplicate" key={props.m1 + "-" + props.m2}>
            <div className="duplicate-side ">
                <div className="duplicate-button">
                    <button disabled={merge1Disabled} className="btn btn-primary" onClick={() => {
                        setMerge1Disabled(true);
                        setMerge2Disabled(true);
                        props.onMerge(props.m1, props.m2);
                    }}>Merge left</button>
                </div>
                <div className="duplicate-description duplicate-left">
                    <Thumbnail playable={true} onClick={() => props.doNext(props.m1)} cover={cover1}/>
                    {duration1 &&
                        <div className="small-pad flex-center">
                            {timeFormat(duration1)}
                        </div>
                    }
                    <span className="color-fg duplicate-title">{tags1?.get("title")?.text}</span>
                </div>
            </div>
            <div className="duplicate-side">
                <div className="duplicate-description duplicate-right">
                    <Thumbnail playable={true} onClick={() => props.doNext(props.m2)} cover={cover2}/>
                    {duration2 &&
                        <div className="small-pad flex-center">
                            {timeFormat(duration2)}
                        </div>
                    }
                    <span className="color-fg duplicate-title">{tags2?.get("title")?.text}</span>
                </div>
                <div className="duplicate-button duplicate-button-right">
                    <button
                        disabled={merge2Disabled}
                        className="btn-primary"
                        onClick={() => {
                            setMerge1Disabled(true);
                            setMerge2Disabled(true);
                            props.onMerge(props.m2, props.m1);
                        }}>Merge right</button>
                </div>
            </div>
        </div>
    );
}

export default Merge;