import React, {useContext, useEffect, useMemo, useRef, useState} from 'react';
import {MetadataCtx} from "../domain/metadata";
import {dotn, useUpdate} from "../common/utils";
import {PCA} from 'ml-pca';
import * as THREE from "three";
import {DoubleSide, Mesh, OrthographicCamera, Scene, Vector3, WebGLRenderer} from "three";

type MusicMapProps = {
}

type GfxContext = {
    camera: OrthographicCamera,
    scene: Scene,
    renderer: WebGLRenderer,
}

let curMouse = [0, 0];

function MusicMap(props: MusicMapProps): JSX.Element {
    const [metadata] = useContext(MetadataCtx);

    const projected = useMemo(() => {
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

        const projected = [];
        for (let v of embeddings) {
            let vv = v.slice();
            for (let i = 0; i < vv.length; i++) {
                vv[i] -= avg[i] ?? 0;
            }
            projected.push([dotn(vv, v1) / l1, dotn(vv, v2) / l2])
        }

        return projected;
    }, [metadata]);

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
        const camera = new THREE.OrthographicCamera(-w/2, w/2, -h/2, h/2, -1000, 1000);
        camera.position.z = 5;
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(w, h);

        console.log("initializing gfxr");
        gfxr.current = {camera: camera, scene: scene, renderer: renderer};
        updateGfxInit();

        const child = rootdiv.current?.appendChild(renderer.domElement);

        let handle: {h: number | null} = {h: null};
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

        const geometry = new THREE.CircleGeometry(3, 16);

        const material = new THREE.MeshBasicMaterial({color: 0xff0000, side: DoubleSide});
        const circles = new THREE.InstancedMesh(geometry, material, projected.length);
        const matrix = new THREE.Matrix4();
        matrix.identity();

        console.log(projected.length);
        for (let i = 0; i < projected.length; i++) {
            const [x, y] = projected[i] as [number, number];
            matrix.setPosition(x * 100, y * 100, 1);
            circles.setMatrixAt(i, matrix);
        }

        gfx.scene.add(circles);
    }, [projected]);

    const [mouseMesh, setMouseMesh] = useState<Mesh | null>(null);

    useEffect(() => {
        if (!gfxinit) {
            return;
        }
        const geometry = new THREE.CircleGeometry(5, 32);
        const material = new THREE.MeshBasicMaterial({color: 0x00ff00, side: DoubleSide});
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = 0;
        mesh.position.y = 0;
        mesh.position.z = 1;

        const gfx = gfxr.current;
        gfx?.scene.add(mesh);
        console.log("adding mouse");

        setMouseMesh(mesh);
    }, [gfxinit]);

    const onMouseMove = (ev: React.MouseEvent) => {
        if (gfxr.current === null) {
            return;
        }
        const gfx = gfxr.current;

        if (ev.buttons === 1) {
            gfx.camera.position.x -= ev.movementX * gfx.camera.scale.x;
            gfx.camera.position.y += ev.movementY * gfx.camera.scale.y;
        }

        gfx.camera.updateMatrixWorld();
        gfx.camera.updateProjectionMatrix();
        gfx.camera.updateMatrix();

        const w = gfx.camera.right - gfx.camera.left;
        const h = gfx.camera.top - gfx.camera.bottom;

        const xoff = rootdiv.current?.offsetLeft || 0;
        const yoff = rootdiv.current?.offsetTop || 0;

        let proj = new Vector3(-1.0 + 2.0 * (ev.clientX - xoff) / w, 1.0 - 2.0 * (ev.clientY - yoff) / h, 5).unproject(gfx.camera);

        // eslint-disable-next-line
        curMouse = [proj.x, proj.y];

        if(mouseMesh) {
            mouseMesh.position.x = proj.x;
            mouseMesh.position.y = proj.y;
        }
    };

    const onScroll = (ev: React.WheelEvent) =>{
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

            gfx.camera.left = -w / 2;
            gfx.camera.right = w / 2;
            gfx.camera.top = h / 2;
            gfx.camera.bottom = -h / 2;

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

    return <div ref={rootdiv} onMouseMove={onMouseMove} onWheel={onScroll} style={{flexGrow: 1, width: "100%"}}>
    </div>
}

export default MusicMap;