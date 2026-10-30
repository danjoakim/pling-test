//# The GIF encoder and the GIF check live in src/gif.ts (bundled as PrekGif). This line gives them their old names, so main.js did not
//# have to change. shrinkGif() (browser decoding) stays in main.js for now. (Lines starting with //# are notes for developers.)
const {GIF_MAX,gifEncode,readGif}=PrekGif;
