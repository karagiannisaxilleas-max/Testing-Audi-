# DORI worked example

This is the reference calculation the engine's `dori` module is tested against
(`src/engine/dori.test.ts`). DORI (EN 62676-4) defines four image-quality
thresholds in pixels per metre of scene:

| Level     | px/m  | Typical use                          |
|-----------|-------|--------------------------------------|
| Identify  | 250   | Recognise a specific known person    |
| Recognize | 125   | Tell whether you know the person     |
| Observe   | 62.5  | Some detail; behaviour/clothing      |
| Detect    | 25    | A person is present                  |

## Example camera

A common prosumer fixed camera:

- Sensor width: **5.37 mm** (1/2.8")
- Lens focal length: **4 mm**
- Horizontal resolution: **2688 px** (4 MP, 2688 × 1520)

### Field of view

```
FOV = 2 · atan(sensorWidth / (2 · focalLength))
    = 2 · atan(5.37 / 8)
    = 2 · atan(0.67125)
    = 2 · 33.857°
    = 67.71°
```

### Pixel density vs. distance

```
sceneWidth(d) = 2 · d · tan(FOV/2)
pxPerMeter(d) = resolutionWidth / sceneWidth(d)
```

With `2 · tan(FOV/2) = 2 · tan(33.857°) = 1.3425`:

```
pxPerMeter(d) = 2688 / (1.3425 · d)
```

### DORI distances

Solving `pxPerMeter(d) = threshold` ⇒ `d = 2688 / (threshold · 1.3425)`:

| Level     | px/m  | Distance |
|-----------|-------|----------|
| Identify  | 250   | **8.01 m**  |
| Recognize | 125   | **16.02 m** |
| Observe   | 62.5  | **32.04 m** |
| Detect    | 25    | **80.09 m** |

So this camera can *identify* a person out to ~8 m, *recognise* to ~16 m, and
merely *detect* presence out to ~80 m. The app draws these as nested coverage
bands; changing the focal length (zooming in) pushes all four distances out
while narrowing the field of view.
