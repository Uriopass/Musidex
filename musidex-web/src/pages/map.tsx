import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {MetadataCtx} from "../domain/metadata";
import {dotn, useUpdate} from "../common/utils";
import {PCA} from 'ml-pca';
import * as THREE from "three";
import {DoubleSide, Mesh, OrthographicCamera, Scene, Vector3, WebGLRenderer} from "three";
import {FilterBySelect, SongElem} from "./explorer";
import {NextTrackCallback} from "../common/tracklist";
import {Tag} from "../common/entity";
import {SearchFormCtx} from "../App";
import Filters, {applyFilters} from "../common/filters";

type MusicMapProps = {
    doNext: NextTrackCallback;
}

type GfxContext = {
    camera: OrthographicCamera,
    scene: Scene,
    renderer: WebGLRenderer,
    mouse?: Mesh,
}

let curMouse = [0, 0];
let moved = false;

function MusicMap(props: MusicMapProps): JSX.Element {
    const [metadata, syncMetadata] = useContext(MetadataCtx);
    const [selected, setSelected] = useState<undefined | number>(undefined);
    const [searchForm, setSearchForm] = useContext(SearchFormCtx);
    const setFilters = useCallback((f: Filters) => setSearchForm({
        ...searchForm,
        filters: f
    }), [setSearchForm, searchForm]);

    const selectedID = metadata.musics[selected || 0] || 0;

    const projectedAll: [number, number][] = useMemo(() => {
        if (metadata.musics.length < 10) {
            return [];
        }
        const embeddings = [];
        let avg: number[] = [];
        for (const v of metadata.embeddings) {
            const vv = v[1].v;
            if (avg.length === 0) {
                avg = vv.slice();
            } else {
                for (let i = 0; i < vv.length; i++) {
                    avg[i] += vv[i] ?? 0;
                }
            }
            embeddings.push(vv);
        }

        for (let i = 0; i < avg.length; i++) {
            avg[i] /= metadata.embeddings.size;
        }

        const pca = new PCA(embeddings);
        const eigenv = pca.getEigenvectors();
        let [l1, l2] = pca.getEigenvalues();
        l1 = Math.sqrt(l1 ?? 0);
        l2 = Math.sqrt(l2 ?? 0);
        const v1: number[] = eigenv.getColumn(0);
        const v2: number[] = eigenv.getColumn(1);

        const projected: [number, number][] = [];
        for (let v of embeddings) {
            let vv = v.slice();
            for (let i = 0; i < vv.length; i++) {
                vv[i] -= avg[i] ?? 0;
            }
            projected.push([dotn(vv, v1) / l1, dotn(vv, v2) / l2])
        }

        return projected;
    }, [metadata]);

    const projected = useMemo(() => {
        const musics = metadata.musics.slice();
        applyFilters(searchForm.filters, musics, metadata);

        const musicSet = new Set(musics);

        const projected: [number, number][] = [];
        for (let i = 0; i < metadata.musics.length; i++) {
            if (musicSet.has(metadata.musics[i] || -1)) {
                let v = projectedAll[i];
                projected.push(v || [0, 0]);
            }
        }
        return projected;
    }, [projectedAll, metadata, searchForm.filters])

    const rootdiv = useRef<HTMLDivElement | null>(null);
    const gfxr = useRef<GfxContext | null>(null);
    const [gfxinit, updateGfxInit] = useUpdate();

    useEffect(() => {
        if (rootdiv.current === null) {
            return;
        }
        const w = 640;
        const h = 400;
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-w / 200, w / 200, -h / 200, h / 200, -1000, 1000);
        camera.position.z = 5;
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(w, h);

        console.log("initializing gfxr");
        gfxr.current = {camera: camera, scene: scene, renderer: renderer};
        updateGfxInit();

        const child = rootdiv.current?.appendChild(renderer.domElement);

        let handle: { h: number | null } = {h: null};
        const animate = function () {
            handle.h = requestAnimationFrame(animate);

            if (gfxr.current) {
                renderer.render(gfxr.current.scene, gfxr.current.camera);
            }
        };
        animate();

        const cur = rootdiv.current;
        return () => {
            console.log("cleaning");
            if (handle.h) {
                cancelAnimationFrame(handle.h);
            }
            cur.removeChild(child);
            scene.clear();
            renderer.dispose();
        }
    }, [updateGfxInit])

    useEffect(() => {
        if (gfxr.current === null) {
            return;
        }
        const gfx = gfxr.current;

        const geometry = new THREE.CircleGeometry(0.02, 32);

        const material = new THREE.MeshBasicMaterial({color: 0xff0000, side: DoubleSide});
        const circles = new THREE.InstancedMesh(geometry, material, projected.length);
        const matrix = new THREE.Matrix4();
        matrix.identity();

        for (let i = 0; i < projected.length; i++) {
            const [x, y] = projected[i] as [number, number];
            matrix.setPosition(x, y, 1);
            circles.setMatrixAt(i, matrix);
        }

        console.log("making circles", projected.length);

        gfx.scene.add(circles);

        return () => {
            circles.removeFromParent();
        }
    }, [projected]);

    useEffect(() => {
        if (!gfxinit || gfxr.current === null) {
            return;
        }
        const geometry = new THREE.CircleGeometry(0.02, 32);
        const material = new THREE.MeshBasicMaterial({color: 0x00ff00, side: DoubleSide});
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = 0;
        mesh.position.y = 0;
        mesh.position.z = 2;
        mesh.visible = false;

        const gfx = gfxr.current;
        gfx.scene.add(mesh);
        gfx.mouse = mesh;
    }, [gfxinit]);

    const onMouseMove = (ev: React.MouseEvent) => {
        moved = true;
        if (gfxr.current === null) {
            return;
        }
        const gfx = gfxr.current;
        if (!gfx.mouse) {
            return;
        }

        if (ev.buttons === 1) {
            gfx.camera.position.x -= ev.movementX * gfx.camera.scale.x * 0.01;
            gfx.camera.position.y += ev.movementY * gfx.camera.scale.y * 0.01;
        }

        gfx.camera.updateMatrixWorld();
        gfx.camera.updateProjectionMatrix();
        gfx.camera.updateMatrix();

        const w = rootdiv.current?.clientWidth || 1;
        const h = rootdiv.current?.clientHeight || 1;

        const xoff = rootdiv.current?.offsetLeft || 0;
        const yoff = rootdiv.current?.offsetTop || 0;

        const v = new Vector3(-1.0 + 2.0 * (ev.clientX - xoff) / w, 1.0 - 2.0 * (ev.clientY - yoff) / h, 5);
        let proj = v.unproject(gfx.camera);

        // eslint-disable-next-line
        curMouse = [proj.x, proj.y];

        let selected;
        let minDist = 100000;
        for (const i of projected.keys()) {
            let [x, y] = projected[i] ?? [0, 0];
            const dist = Math.sqrt((x - proj.x) * (x - proj.x) + (y - proj.y) * (y - proj.y));
            if (dist < 0.1 && dist < minDist) {
                gfx.mouse.position.x = x;
                gfx.mouse.position.y = y;
                gfx.mouse.visible = true;
                selected = i;
                minDist = dist;
            }
        }
        if (selected) {
            setSelected(selected);
        }
    }

    const onMouseClick = (ev: React.MouseEvent) => {
        if (moved) {
            return;
        }
        if (selected) {
            props.doNext(selectedID);
        }
    };

    const onScroll = (ev: React.WheelEvent) => {
        if (gfxr.current === null) {
            return;
        }
        const gfx = gfxr.current;

        gfx.camera.scale.x *= Math.pow(1.2, ev.deltaY / 50);
        gfx.camera.scale.y *= Math.pow(1.2, ev.deltaY / 50);
    };

    useEffect(() => {
        if (gfxr.current !== null && rootdiv.current !== null) {
            const gfx = gfxr.current;
            const w = rootdiv.current.offsetWidth;
            const h = rootdiv.current.offsetHeight;
            gfx.renderer.setSize(w, h);

            gfx.camera.left = -w / 200;
            gfx.camera.right = w / 200;
            gfx.camera.top = h / 200;
            gfx.camera.bottom = -h / 200;

            gfx.camera.updateProjectionMatrix();
        }
    })
    gfxr.current?.camera.updateMatrixWorld();

    const upd = useUpdate();

    useEffect(() => {
        const call = () => {
            upd[1]();
        };
        window.addEventListener('resize', call);

        return () => {
            window.removeEventListener('resize', call);
        }
    }, [upd]);


    return <>
        <div ref={rootdiv} onMouseDown={() => moved = false} onMouseMove={onMouseMove} onWheel={onScroll}
             onMouseUp={onMouseClick} style={{flexGrow: 1, width: "100%"}}>
        </div>
        <div style={{flexBasis: 120, width: 500, display: "flex", alignItems: "center", flexDirection: "column"}}>
            <FilterBySelect
                users={metadata.users}
                filters={searchForm.filters}
                setFilters={setFilters}/>
            {(selected !== undefined) &&
            <SongElem
                syncMetadata={syncMetadata}
                doNext={props.doNext}
                tags={metadata.music_tags_idx.get(selectedID) || new Map<string, Tag>()}
                musicID={selectedID}
            />}
        </div>
    </>
}

export default MusicMap;