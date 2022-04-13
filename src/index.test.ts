import useTailwindColors from './index';

test("test create swatch", () => {
  expect(useTailwindColors('#22C55E')).toEqual({
    "c50": "#E9FBF0",
    "c100": "#CFF7DE",
    "c200": "#9FEFBC",
    "c300": "#6FE69B",
    "c400": "#40DE7A",
    "c500": "#22C55E",
    "c600": "#1B9D4B",
    "c700": "#147538",
    "c800": "#0D4E25",
    "c900": "#072713"
  })
})
