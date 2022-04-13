import { PaletteConfig } from './types';

export function output(palettes: PaletteConfig[]) {
  const shaped = {};

  palettes.forEach((palette) => {
    const swatches = {};
    palette.swatches
      .filter((swatch) => ![0, 1000].includes(swatch.stop))
      .forEach((swatch) => Object.assign(swatches, { [swatch.stop]: swatch.hex.toUpperCase() }));

    Object.assign(shaped, { [palette.name]: swatches });
  });

  return shaped;
}
