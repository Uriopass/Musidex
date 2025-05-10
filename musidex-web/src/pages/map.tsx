import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {MetadataCtx} from "../domain/metadata";
import {dotn, useUpdate} from "../common/utils";
import {PCA} from 'ml-pca';
import * as THREE from "three";
import {Camera, Mesh, OrthographicCamera, PerspectiveCamera, Scene, Vector2, Vector3, WebGLRenderer} from "three";
import {FilterBySelect, Thumbnail} from "./explorer";
import {NextTrackCallback} from "../common/tracklist";
import {Tag} from "../common/entity";
import {SearchFormCtx, TracklistCtx} from "../App";
import Filters, {applyFilters} from "../common/filters";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {run_tsne} from '@uriopass/tsne-wasm';

type MusicMapProps = {
    doNext: NextTrackCallback;
}

type GfxContext = {
    camera: Camera,
    scene: Scene,
    renderer: WebGLRenderer,
    mouse?: Mesh,
    curplaying?: Mesh,
    controls: OrbitControls,
}

let moved = false;
let leftClicked = false;

function MusicMap(props: MusicMapProps): JSX.Element {
    const [realMetadata] = useContext(MetadataCtx);
    const list = useContext(TracklistCtx);
    const [metadata, setMetadata] = useState(realMetadata);
    if (metadata.musics.length === 0 && realMetadata.musics.length > 0) {
        setMetadata(realMetadata);
    }

    const [selected, setSelected] = useState<undefined | number>(undefined);
    const [selectedPos, setSelectedPos] = useState<[number, number]>([0, 0]);
    const [searchForm, setSearchForm] = useContext(SearchFormCtx);
    const setFilters = useCallback((f: Filters) => setSearchForm({
        ...searchForm,
        filters: f
    }), [setSearchForm, searchForm]);
    const [_3d, set3D] = useState(false);
    const rootdiv = useRef<HTMLDivElement | null>(null);
    const gfxr = useRef<GfxContext | null>(null);
    const [gfxinit, updateGfxInit] = useUpdate();
    const [algorithmBase, setAlgorithm] = useState<"tsne" | "pca">("pca");
    const algorithm: "pca" | "tsne3D" | "tsne2D" = (algorithmBase === "pca") ? "pca" : (_3d ? "tsne3D" : "tsne2D");

    if (gfxr.current) {
        gfxr.current.controls.enableRotate = _3d;
    }

    const projectedAll: [number, number, number, number][] = useMemo(() => {
        let projected: [number, number, number, number][] = [];
        const n = metadata.embeddings.size;
        if (n < 10) {
            return projected;
        }
        let origdim = 0;
        const mids = [];
        for (const v of metadata.embeddings.entries()) {
            origdim = v[1].length;
            mids.push(v[0]);
        }
        console.log("recalculating projection");

        if (algorithm === "pca") {
            const embeddings = [];
            let avg: number[] = [];
            for (const v of metadata.embeddings.entries()) {
                const vv = v[1];
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
            let [l1, l2, l3] = pca.getEigenvalues();
            l1 = Math.sqrt(l1 ?? 0);
            l2 = Math.sqrt(l2 ?? 0);
            l3 = Math.sqrt(l3 ?? 0);
            const v1: number[] = eigenv.getColumn(0);
            const v2: number[] = eigenv.getColumn(1);
            const v3: number[] = eigenv.getColumn(2);

            let idx = 0;
            for (let v of embeddings) {
                let vv = v.slice();
                for (let i = 0; i < vv.length; i++) {
                    vv[i] -= avg[i] ?? 0;
                }
                projected.push([dotn(vv, v1) / l1, dotn(vv, v2) / l2, dotn(vv, v3) / l3, mids[idx] ?? -1]);
                idx++;
            }
        } else if (algorithm === "tsne2D" || algorithm === "tsne3D") {
            const dim = _3d ? 3 : 2;
            let data = new Float64Array(origdim * n);

            let i = 0;
            for (const v of metadata.embeddings) {
                const vv = v[1];
                for (const vvv of vv) {
                    data[i] = vvv;
                    i++;
                }
            }

            const y = run_tsne(data, n, origdim, dim, 20, 0.5, false, 250);

            for (let i = 0; i < y.length; i += dim) {
                const yo: [number, number, number, number] = [0, 0, 0.1, mids[i / dim] ?? -1];
                for (let j = 0; j < dim; j++) {
                    yo[j] = y[i + j] || 0;
                }
                projected.push(yo);
            }
        }
        let rescale = 0;
        for (let v of projected) {
            rescale = Math.max(rescale, v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        }
        rescale = Math.sqrt(rescale) / 2;
        for (let i of projected.keys()) {
            let v = projected[i];
            // @ts-ignore
            projected[i] = [v[0] / rescale, v[1] / rescale, v[2] / rescale, v[3]];
        }
        return projected;
        // eslint-disable-next-line
    }, [metadata, algorithm]);

    const [projected, projectedDisabled]: [[number, number, number, number][], [number, number, number][]] = useMemo(() => {
        const musics = metadata.musics.slice();
        applyFilters(searchForm.filters, musics, metadata);

        const musicSet = new Set(musics);

        const projected: [number, number, number, number][] = [];
        const projectedDisabled: [number, number, number][] = [];
        for (let i = 0; i < metadata.musics.length; i++) {
            const mid = metadata.musics[i] ?? -1;
            let v = projectedAll[i] || [0, 0, 0];
            if (musicSet.has(mid)) {
                projected.push([v[0], v[1], v[2], mid]);
            } else {
                projectedDisabled.push([v[0], v[1], v[2]]);
            }
        }
        return [projected, projectedDisabled];
    }, [projectedAll, metadata, searchForm.filters])

    useEffect(() => {
        if (rootdiv.current === null) {
            return;
        }
        const w = rootdiv.current.offsetWidth;
        const h = rootdiv.current.offsetHeight;
        const scene = new THREE.Scene();
        let camera: Camera = new THREE.OrthographicCamera(-w / 200, w / 200, -h / 200, h / 200, -1000, 1000);
        if (_3d) {
            camera = new THREE.PerspectiveCamera(70, w / h);
        }

        camera.position.z = 5;
        const renderer = new THREE.WebGLRenderer({antialias: true});
        renderer.setSize(w, h);
        renderer.setClearColor("#09090b");

        const directionalLight = new THREE.HemisphereLight("#ffffff", "#342727", 1);
        directionalLight.position.set(0.5, 0.5, 1);
        scene.add(directionalLight);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.mouseButtons = {
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE
        }

        console.log("initializing gfxr");
        gfxr.current = {camera: camera, scene: scene, renderer: renderer, controls: controls};
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
    }, [updateGfxInit, _3d])

    useEffect(() => {
        if (!gfxinit || gfxr.current === null) {
            return;
        }
        const gfx = gfxr.current;

        const geometry = new THREE.SphereGeometry(0.02, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: "#54636f",
            shininess: 0,
            emissive: "#ffffff",
            emissiveIntensity: 0.05
        });
        const circles = new THREE.InstancedMesh(geometry, material, projected.length);
        const matrix = new THREE.Matrix4();
        matrix.identity();

        for (let i = 0; i < projected.length; i++) {
            const [x, y, z] = projected[i] as [number, number, number, number];
            matrix.setPosition(x, y, _3d ? z : 1);
            circles.setMatrixAt(i, matrix);
        }
        const materialDisabled = new THREE.MeshPhongMaterial({
            color: "#313539",
            transparent: true,
            opacity: 0.25,
            shininess: 0,
            emissive: "#ffffff",
            emissiveIntensity: 0.01
        });
        const circlesDisabled = new THREE.InstancedMesh(geometry, materialDisabled, projectedDisabled.length);

        for (let i = 0; i < projectedDisabled.length; i++) {
            const [x, y, z] = projectedDisabled[i] as [number, number, number];
            matrix.setPosition(x, y, _3d ? z : 1);
            circlesDisabled.setMatrixAt(i, matrix);
        }

        console.log("making circles", projected.length);

        gfx.scene.add(circles);
        gfx.scene.add(circlesDisabled);

        return () => {
            circles.removeFromParent();
            circlesDisabled.removeFromParent();
        }
// eslint-disable-next-line
    }, [gfxinit, projected, projectedDisabled]);

    useEffect(() => {
        if (!gfxinit || gfxr.current === null) {
            return;
        }
        const geometrymouse = new THREE.SphereGeometry(0.021, 32, 32);
        const materialmouse = new THREE.MeshPhongMaterial({
            color: "#863aa3",
            shininess: 0,
            emissive: "#ffffff",
            emissiveIntensity: 0.1
        });

        const meshmouse = new THREE.Mesh(geometrymouse, materialmouse);
        meshmouse.position.x = 0;
        meshmouse.position.y = 0;
        meshmouse.position.z = 2;
        meshmouse.visible = false;

        const geometrycurplaying = new THREE.SphereGeometry(0.022, 32, 32);
        const materialcurplaying = new THREE.MeshPhongMaterial({
            color: "#4ab87c",
            shininess: 0,
            emissive: "#ffffff",
            emissiveIntensity: 0.1
        });

        const meshcurplaying = new THREE.Mesh(geometrycurplaying, materialcurplaying);
        meshcurplaying.position.x = 0;
        meshcurplaying.position.y = 0;
        meshcurplaying.position.z = 2;
        meshcurplaying.visible = false;

        const gfx = gfxr.current;
        gfx.scene.add(meshcurplaying);
        gfx.scene.add(meshmouse);
        gfx.mouse = meshmouse;
        gfx.curplaying = meshcurplaying;

        return () => {
            meshmouse.removeFromParent();
            meshcurplaying.removeFromParent();
        }
    }, [gfxinit]);

    useEffect(() => {
        if (gfxr.current === null) {
            return;
        }
        const gfx = gfxr.current;
        if (gfx.curplaying === undefined) {
            return;
        }

        gfx.curplaying.visible = false;
        if (list.last_played.length === 0) {
            return;
        }
        const playing = list.last_played[list.last_played.length - 1];
        for (const i of projectedAll.keys()) {
            const v = projectedAll[i] as [number, number, number, number];
            if (v[3] === playing) {
                gfx.curplaying.position.x = v[0];
                gfx.curplaying.position.y = v[1];
                gfx.curplaying.position.z = _3d ? v[2] : 1.1;
                gfx.curplaying.visible = true;
                break;
            }
        }
    }, [list, gfxinit, gfxr?.current?.curplaying, projectedAll, _3d])

    const onMouseMove = (ev: React.MouseEvent) => {
        moved = true;
        if (gfxr.current === null) {
            return;
        }
        const gfx = gfxr.current;
        if (!gfx.mouse) {
            return;
        }

        gfx.camera.updateMatrixWorld();
        gfx.camera.updateMatrix();

        const w = rootdiv.current?.clientWidth || 1;
        const h = rootdiv.current?.clientHeight || 1;

        const xoff = rootdiv.current?.offsetLeft || 0;
        const yoff = rootdiv.current?.offsetTop || 0;

        const v = new Vector2(-1.0 + 2.0 * (ev.clientX - xoff) / w, 1.0 - 2.0 * (ev.clientY - yoff) / h);

        let selected: number | undefined = undefined;
        let selectedPos: [number, number] = [0, 0];
        let minDist = 100000;
        gfx.mouse.visible = false;
        for (const i of projected.keys()) {
            let [x, y, z, mid] = projected[i] ?? [0, 0, 0, -1];
            const projectedCam = new Vector3(x, y, z).project(gfx.camera);

            const dist = Math.sqrt((v.x - projectedCam.x) * (v.x - projectedCam.x) + (v.y - projectedCam.y) * (v.y - projectedCam.y));
            if (dist < 0.1 && dist < minDist) {
                gfx.mouse.position.x = x;
                gfx.mouse.position.y = y;
                gfx.mouse.position.z = _3d ? z : 1.1;
                gfx.mouse.visible = true;
                selected = mid;
                selectedPos = [(projectedCam.x + 1.0) / 2.0 * w, (-projectedCam.y + 1.0) / 2.0 * h];
                minDist = dist;
            }
        }
        setSelected(selected);
        setSelectedPos(selectedPos);
    }

    const onMouseClick = () => {
        if (moved) {
            return;
        }
        if (selected && leftClicked) {
            props.doNext(selected);
        }
    };

    useEffect(() => {
        if (gfxr.current !== null && rootdiv.current !== null) {
            const gfx = gfxr.current;
            const w = rootdiv.current.offsetWidth;
            const h = rootdiv.current.offsetHeight;
            gfx.renderer.setSize(w, h);

            updateCamera(w, h, gfx.camera);
        }
    })
    gfxr.current?.camera.updateMatrixWorld();
    (gfxr.current?.camera as any)?.updateProjectionMatrix();

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

    let selectedTags = metadata.music_tags_idx.get(selected ?? -1) || new Map<string, Tag>();

    let cover = selectedTags?.get("compressed_thumbnail")?.text || selectedTags?.get("thumbnail")?.text;

    return <>
        <div ref={rootdiv} onMouseDown={(ev) => {
            moved = false;
            leftClicked = ev.buttons === 1;
        }} onMouseMove={onMouseMove} onMouseUp={onMouseClick} style={{flexGrow: 1, width: "100%"}}>
            <div
                style={{
                    pointerEvents: "none",
                    left: selectedPos[0] + 30,
                    top: selectedPos[1] + 60,
                    position: "absolute",
                    zIndex: 1,
                    width: 250,
                    borderRadius: 5,
                    backgroundColor: "var(--bg)",
                    display: (selectedPos[0] === 0 && selectedPos[1] === 0) ? "none" : "flex",
                    flexDirection: "row",
                    color: "var(--color-fg)",
                    overflow: "hidden",
                }}
            >
                <Thumbnail cover={cover}/>
                <div style={{
                    paddingLeft: "10px",
                    display: "flex",
                    flexDirection: "column",
                    fontSize: "1rem",
                    justifyContent: "space-evenly",
                    alignItems: "flex-start",
                    textAlign: "left"
                }}>
                    <b>
                        {selectedTags?.get("title")?.text}
                    </b>
                    <span className="small gray-fg">
                        {selectedTags?.get("artist")?.text}
                    </span>
                </div>
            </div>
        </div>
        <div style={{
            flexBasis: 45,
            maxWidth: 1000,
            width: "100%",
            display: "flex",
            alignItems: "flex-start",
            flexDirection: "column",
            color: "var(--color-fg)",
        }}>
            <div style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                flexDirection: "row"
            }}>
                <span style={{
                    cursor: "pointer",
                    marginLeft: 10,
                    marginRight: 10,
                    color: _3d ? "var(--primary)" : "var(--color-bg)"
                }}
                      onClick={() => set3D(!_3d)}>Enable 3D</span>
                <FilterBySelect
                    users={metadata.users}
                    filters={searchForm.filters}
                    setFilters={setFilters}/>
            </div>
            <span style={{color: "var(--color-bg)"}}>
                Algorithm:
                <span style={{
                    cursor: "pointer",
                    marginLeft: 10,
                    marginRight: 10,
                    color: (algorithm === "tsne2D" || algorithm === "tsne3D") ? "var(--primary)" : "var(--color-bg)"
                }}
                      onClick={() => setAlgorithm("tsne")}>t-Sne (expensive)</span>
                <span style={{
                    cursor: "pointer",
                    marginLeft: 10,
                    marginRight: 10,
                    color: (algorithm === "pca") ? "var(--primary)" : "var(--color-bg)"
                }}
                      onClick={() => setAlgorithm("pca")}>PCA</span>
            </span>

        </div>
    </>
}

function updateCamera(w: number, h: number, cam: Camera) {
    if (cam instanceof OrthographicCamera) {
        cam.left = -w / 200;
        cam.right = w / 200;
        cam.top = h / 200;
        cam.bottom = -h / 200;
    }

    if (cam instanceof PerspectiveCamera) {
        cam.aspect = w / h;
    }
}

export default MusicMap;