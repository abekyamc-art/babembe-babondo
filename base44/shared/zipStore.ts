/**
 * A ZIP written from bytes as they stand, in the one browser every phone already has.
 *
 * The pictures the admin saved are kept in the app's private storage, and a link to one of them is
 * short-lived and readable only through the app — so the folder of them is built here, on the server,
 * where every file can be read, and handed back as one download. Nothing is packed, because a
 * picture is already packed: the rows are written as they are, which keeps the folder exact and the
 * writing quick.
 */

export type ZipItem = { name: string; bytes: Uint8Array };

// The table every ZIP reader checks its files by, built once and kept.
let crcTable: Uint32Array | null = null;

/** The checksum a ZIP is read back by: the same figure the reader compares each file against. */
function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    crcTable = table;
  }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** A moment as the two figures a ZIP stamps a file with. */
function stamp(at: Date) {
  return {
    time: ((at.getHours() << 11) | (at.getMinutes() << 5) | (at.getSeconds() >> 1)) & 0xffff,
    date: (((at.getFullYear() - 1980) << 9) | ((at.getMonth() + 1) << 5) | at.getDate()) & 0xffff,
  };
}

/** Every file written into one folder, as the bytes of the folder itself. */
export function zipStore(items: ZipItem[], at = new Date()): Uint8Array {
  const encoder = new TextEncoder();
  const when = stamp(at);
  const files = items
    .filter((item) => item?.name && item?.bytes?.length)
    .map((item) => ({
      name: encoder.encode(item.name),
      bytes: item.bytes,
      crc: crc32(item.bytes),
    }));

  let size = 22;
  files.forEach((file) => {
    size += 30 + file.name.length + file.bytes.length + 46 + file.name.length;
  });

  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  const places: number[] = [];
  let here = 0;

  const put16 = (value: number) => {
    view.setUint16(here, value & 0xffff, true);
    here += 2;
  };
  const put32 = (value: number) => {
    view.setUint32(here, value >>> 0, true);
    here += 4;
  };

  files.forEach((file) => {
    places.push(here);
    put32(0x04034b50); // a file begins here
    put16(20); // the version it needs to be read
    put16(0x0800); // its name is read as written, letters and all
    put16(0); // kept exactly as it is, not packed
    put16(when.time);
    put16(when.date);
    put32(file.crc);
    put32(file.bytes.length);
    put32(file.bytes.length);
    put16(file.name.length);
    put16(0); // nothing beside the name
    out.set(file.name, here);
    here += file.name.length;
    out.set(file.bytes, here);
    here += file.bytes.length;
  });

  const dirAt = here;
  files.forEach((file, index) => {
    put32(0x02014b50); // the index of the folder, where each file is named
    put16(20);
    put16(20);
    put16(0x0800);
    put16(0);
    put16(when.time);
    put16(when.date);
    put32(file.crc);
    put32(file.bytes.length);
    put32(file.bytes.length);
    put16(file.name.length);
    put16(0);
    put16(0);
    put16(0);
    put16(0);
    put32(0);
    put32(places[index]);
    out.set(file.name, here);
    here += file.name.length;
  });

  put32(0x06054b50); // and where the index itself stands, so the folder opens as one
  put16(0);
  put16(0);
  put16(files.length);
  put16(files.length);
  put32(here - dirAt);
  put32(dirAt);
  put16(0);

  return out;
}