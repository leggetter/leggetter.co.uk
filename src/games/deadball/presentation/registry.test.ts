/**
 * Which looks and which cameras exist, and how one is picked.
 *
 * Split out of the drag tests when the drag moved into the toolkit: these ask
 * about the registry, which is above every package, and the toolkit is below
 * all of them.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  CAMERAS,
  cameraFor,
  createPackage,
  DEFAULT_CAMERA,
  DEFAULT_PACKAGE,
  listCameras,
  listPackages,
  PACKAGES,
  resolveCameraId,
  resolvePackageId,
} from './registry.ts';

describe('the camera list', () => {
  test('carries all three, each with a label', () => {
    const cameras = listCameras();
    assert.equal(cameras.length, 3);
    for (const { id, label } of cameras) {
      assert.ok(id.length > 0 && label.length > 0, `${id} needs a label`);
      assert.equal(cameraFor(id).id, id, 'a camera must know its own id');
    }
  });

  test('the URL wins, then what was stored, then the default', () => {
    assert.equal(resolveCameraId('?view=keeper-cam', 'angled-behind'), 'keeper-cam');
    assert.equal(resolveCameraId('', 'angled-behind'), 'angled-behind');
    assert.equal(resolveCameraId('', null), DEFAULT_CAMERA);
  });

  test('nonsense falls back rather than breaking the page', () => {
    assert.equal(resolveCameraId('?view=from-the-blimp', null), DEFAULT_CAMERA);
    assert.equal(resolveCameraId('', 'from-the-blimp'), DEFAULT_CAMERA);
    assert.equal(cameraFor('from-the-blimp').id, DEFAULT_CAMERA);
  });

  test('every registered camera is reachable by its own key', () => {
    for (const id of Object.keys(CAMERAS)) {
      assert.equal(resolveCameraId(`?view=${id}`, null), id);
    }
  });

  test('exactly one camera is behind the goal, and it is the mirrored one', () => {
    // The two flags are the only things a camera changes beyond its position,
    // and they travel together for a reason: having gone round the back, the
    // taker's right is on your left *and* the netting is the nearest thing in
    // shot. A camera with one and not the other is a mistake, not a style.
    const behind = Object.values(CAMERAS).filter((c) => c.fromBehindTheGoal);
    assert.equal(behind.length, 1);
    assert.equal(behind[0]!.mirrored, true);
    for (const camera of Object.values(CAMERAS)) {
      assert.equal(camera.mirrored, camera.fromBehindTheGoal, `${camera.id}`);
    }
  });

  test('every camera frames something wider than the goal', () => {
    // A frame narrower than the goal cannot fit the goal, whatever the screen.
    for (const camera of Object.values(CAMERAS)) {
      assert.ok(camera.frame.halfWidth > 7.32 / 2, `${camera.id} cannot fit a goal`);
      assert.ok(camera.frame.depth > 0, `${camera.id} frames something behind it`);
    }
  });
});

describe('the package list', () => {
  test('classic is there and is the default', () => {
    const packages = listPackages();
    assert.ok(packages.length >= 1);
    assert.ok(DEFAULT_PACKAGE in PACKAGES);
    for (const { id, label } of packages) {
      assert.ok(id.length > 0 && label.length > 0, `${id} needs a label`);
    }
  });

  test('a package and a camera are separate choices', () => {
    // The whole point of cameras being data: picking a look must not pick a
    // place to stand, or adding `pixel` would mean three more files.
    assert.equal(resolvePackageId('?view=keeper-cam', null), DEFAULT_PACKAGE);
    assert.equal(resolveCameraId('?look=pixel', null), DEFAULT_CAMERA);
  });

  test('nonsense falls back rather than breaking the page', () => {
    assert.equal(resolvePackageId('?look=hand-drawn', null), DEFAULT_PACKAGE);
    assert.equal(createPackage('hand-drawn').id, DEFAULT_PACKAGE);
  });

  test('the 3D look is there to ask for, marked as a preview, and never the default', () => {
    const stylised = listPackages().find((p) => p.id === 'stylised');
    assert.ok(stylised, 'stylised is not listed');
    assert.equal(stylised.preview, true);
    assert.equal(listPackages().find((p) => p.id === 'classic')?.preview, false);
    assert.notEqual(DEFAULT_PACKAGE, 'stylised');
    assert.equal(resolvePackageId('?look=stylised', null), 'stylised');
    assert.equal(resolvePackageId('', 'stylised'), 'stylised', 'a stored choice is kept');
    assert.equal(resolvePackageId('?look=classic', 'stylised'), 'classic', 'and the URL still wins');
  });
});
