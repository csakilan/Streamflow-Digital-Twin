/** Credits follow the current XR head pose in the lower field of view. */
export function placeViewerCredits(mesh,camera){
 const world=camera.localToWorld(mesh.position.clone().set(0,-.65,-1.85));
 mesh.position.copy(mesh.parent.worldToLocal(world));
 const facing=camera.getWorldQuaternion(mesh.quaternion.clone());
 mesh.quaternion.copy(mesh.parent.getWorldQuaternion(mesh.quaternion.clone()).invert()).multiply(facing);
}
