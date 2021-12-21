import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {MetadataCtx} from "../domain/metadata";
import {dotn, useUpdate} from "../common/utils";
import {PCA} from 'ml-pca';
import * as THREE from "three";
import {
    Camera,
    DoubleSide,
    Mesh,
    OrthographicCamera,
    PerspectiveCamera,
    Scene,
    Vector2,
    Vector3,
    WebGLRenderer
} from "three";
import {FilterBySelect, SongElem} from "./explorer";
import {NextTrackCallback} from "../common/tracklist";
import {Tag} from "../common/entity";
import {SearchFormCtx} from "../App";
import Filters, {applyFilters} from "../common/filters";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";

type MusicMapProps = {
    doNext: NextTrackCallback;
}

type GfxContext = {
    camera: Camera,
    scene: Scene,
    renderer: WebGLRenderer,
    mouse?: Mesh,
    controls: OrbitControls,
}

let moved = false;

function MusicMap(props: MusicMapProps): JSX.Element {
    const [metadata, syncMetadata] = useContext(MetadataCtx);
    const [selected, setSelected] = useState<undefined | number>(undefined);
    const [searchForm, setSearchForm] = useContext(SearchFormCtx);
    const setFilters = useCallback((f: Filters) => setSearchForm({
        ...searchForm,
        filters: f
    }), [setSearchForm, searchForm]);
    const [_3d, set3D] = useState(false);
    const rootdiv = useRef<HTMLDivElement | null>(null);
    const gfxr = useRef<GfxContext | null>(null);
    const [gfxinit, updateGfxInit] = useUpdate();

    if(gfxr.current) {
        gfxr.current.controls.enableRotate = _3d;
    }

    const projectedAll: [number, number, number][] = useMemo(() => {
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
        let [l1, l2, l3] = pca.getEigenvalues();
        l1 = Math.sqrt(l1 ?? 0);
        l2 = Math.sqrt(l2 ?? 0);
        l3 = Math.sqrt(l3 ?? 0);
        const v1: number[] = eigenv.getColumn(0);
        const v2: number[] = eigenv.getColumn(1);
        const v3: number[] = eigenv.getColumn(2);

        const projected: [number, number, number][] = [];
        for (let v of embeddings) {
            let vv = v.slice();
            for (let i = 0; i < vv.length; i++) {
                vv[i] -= avg[i] ?? 0;
            }
            projected.push([dotn(vv, v1) / l1, dotn(vv, v2) / l2, dotn(vv, v3) / l3])
        }

        return projected;
    }, [metadata]);

    const projected: [number, number, number, number][] = useMemo(() => {
        const musics = metadata.musics.slice();
        applyFilters(searchForm.filters, musics, metadata);

        const musicSet = new Set(musics);

        const projected: [number, number, number, number][] = [];
        for (let i = 0; i < metadata.musics.length; i++) {
            const mid = metadata.musics[i] || -1;
            if (musicSet.has(mid)) {
                let v = projectedAll[i] || [0, 0, 0];
                projected.push([v[0], v[1], v[2], mid]);
            }
        }
        return projected;
    }, [projectedAll, metadata, searchForm.filters])

    useEffect(() => {
        if (rootdiv.current === null) {
            return;
        }
        const w = rootdiv.current.offsetWidth;
        const h = rootdiv.current.offsetHeight;
        const scene = new THREE.Scene();
        let camera: Camera = new THREE.OrthographicCamera(-w / 200, w / 200, -h / 200, h / 200, -1000, 1000);
        if(_3d) {
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
        const material = new THREE.MeshPhongMaterial({color: "#54636f", shininess: 0, emissive: "#ffffff", emissiveIntensity: 0.05});
        const circles = new THREE.InstancedMesh(geometry, material, projected.length);
        const matrix = new THREE.Matrix4();
        matrix.identity();

        for (let i = 0; i < projected.length; i++) {
            const [x, y, z] = projected[i] as [number, number, number, number];
            matrix.setPosition(x, y, _3d ? z : 1);
            circles.setMatrixAt(i, matrix);
        }

        console.log("making circles", projected.length);

        gfx.scene.add(circles);

        return () => {
            circles.removeFromParent();
        }
    }, [gfxinit, projected]);

    useEffect(() => {
        if (!gfxinit || gfxr.current === null) {
            return;
        }
        const geometry = new THREE.SphereGeometry(0.021, 32, 32);
        const material = new THREE.MeshPhongMaterial({color: "#863aa3", shininess: 0, emissive: "#ffffff", emissiveIntensity: 0.1});

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

        gfx.camera.updateMatrixWorld();
        gfx.camera.updateMatrix();

        const w = rootdiv.current?.clientWidth || 1;
        const h = rootdiv.current?.clientHeight || 1;

        const xoff = rootdiv.current?.offsetLeft || 0;
        const yoff = rootdiv.current?.offsetTop || 0;

        const v = new Vector2(-1.0 + 2.0 * (ev.clientX - xoff) / w, 1.0 - 2.0 * (ev.clientY - yoff) / h);

        let selected;
        let minDist = 100000;
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
                minDist = dist;
            }
        }
        if (selected) {
            setSelected(selected);
        }
    }

    const onMouseClick = (ev: React.MouseEvent) => {
        if (moved || ev.buttons !== 1) {
            return;
        }
        if (selected) {
            props.doNext(selected);
        }
    };

    const onScroll = (ev: React.WheelEvent) => {
        if (gfxr.current === null) {
            return;
        }
        const gfx = gfxr.current;

        const factor = Math.pow(1.2, ev.deltaY / 50);
        //gfx.camera.position.z *= factor;
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


    return <>
        <div ref={rootdiv} onMouseDown={() => moved = false} onMouseMove={onMouseMove} onWheel={onScroll}
             onMouseUp={onMouseClick} style={{flexGrow: 1, width: "100%"}}>
        </div>
        <div style={{
            flexBasis: 120,
            maxWidth: 1000,
            width: "100%",
            display: "flex",
            alignItems: "center",
            flexDirection: "column"
        }}>
            <div style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                flexDirection: "row"
            }}>
                <span style={{cursor: "pointer", marginLeft: 10, marginRight: 10, color: _3d ? "var(--primary)": "inherit"}}
                onClick={() => set3D(!_3d)}>Enable 3D</span>
                <FilterBySelect
                    users={metadata.users}
                    filters={searchForm.filters}
                    setFilters={setFilters}/>
            </div>
            {(selected !== undefined) &&
            <SongElem
                syncMetadata={syncMetadata}
                doNext={props.doNext}
                tags={metadata.music_tags_idx.get(selected) || new Map<string, Tag>()}
                musicID={selected}
            />}
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