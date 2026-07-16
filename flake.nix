{
  description = "Tessera Mono — a neoretro 8×16 bitmap monospace font";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        nodejs = pkgs.nodejs_22;
        version = "0.1.0-draft";

        src = pkgs.lib.cleanSourceWith {
          filter = name: type:
            let base = baseNameOf name;
            in base != "node_modules" && base != ".git" && base != "screenshots";
          src = ./.;
        };

        # Fixed-size OTB bitmap strikes (8N×16N px cell). Terminals render
        # these pixel-perfect at their native size, no point-size tuning.
        mkOtb = scale:
          let s = toString scale;
          in pkgs.stdenv.mkDerivation {
            pname = "tessera-mono-otb-${s}x";
            inherit version src;

            nativeBuildInputs = [ nodejs pkgs.fonttosfnt ];

            buildPhase = ''
              runHook preBuild
              node scripts/check-glyphs.mjs
              node scripts/build-bdf.mjs --scale ${s} --output dist/TesseraMono-${s}x.bdf
              fonttosfnt -o TesseraMono-${s}x.otb dist/TesseraMono-${s}x.bdf
              runHook postBuild
            '';

            installPhase = ''
              runHook preInstall
              install -Dm444 TesseraMono-${s}x.otb \
                $out/share/fonts/opentype/TesseraMono-${s}x.otb
              runHook postInstall
            '';

            meta = tessera-mono.meta // {
              description = "Tessera Mono bitmap strike at ${s}x (${toString (8 * scale)}×${toString (16 * scale)} px cell)";
            };
          };

        # All three strikes packed into one OTB so the "Tessera Mono" family
        # exact-matches pixelsize 16/32/48 — Xft apps (dmenu, oxwm, …) then never
        # rescale the bitmap, which is what causes the horizontal squash at
        # non-native sizes. Request it as `Tessera Mono:pixelsize=16|32|48`.
        otbAll = pkgs.stdenv.mkDerivation {
          pname = "tessera-mono-otb";
          inherit version src;

          nativeBuildInputs = [ nodejs pkgs.fonttosfnt ];

          buildPhase = ''
            runHook preBuild
            node scripts/check-glyphs.mjs
            node scripts/build-bdf.mjs --scale 1 --output dist/TesseraMono-1x.bdf
            node scripts/build-bdf.mjs --scale 2 --output dist/TesseraMono-2x.bdf
            node scripts/build-bdf.mjs --scale 3 --output dist/TesseraMono-3x.bdf
            fonttosfnt -o TesseraMono.otb \
              dist/TesseraMono-1x.bdf dist/TesseraMono-2x.bdf dist/TesseraMono-3x.bdf
            runHook postBuild
          '';

          installPhase = ''
            runHook preInstall
            install -Dm444 TesseraMono.otb \
              $out/share/fonts/opentype/TesseraMono.otb
            runHook postInstall
          '';

          meta = tessera-mono.meta // {
            description = "Tessera Mono multi-strike bitmap font — 16/32/48 px cells in one OTB";
          };
        };

        tessera-mono = pkgs.buildNpmPackage {
          pname = "tessera-mono";
          inherit version src nodejs;
          npmDepsHash = "sha256-FuYKLVSHHwuj4ZdNAxZN8Zk644aCvcTqHoa0NSl0M1E=";
          npmBuildScript = "build:font";

          installPhase = ''
            runHook preInstall
            mkdir -p $out/share/fonts/truetype
            cp dist/TesseraMono-Regular.ttf $out/share/fonts/truetype/
            runHook postInstall
          '';

          meta = with pkgs.lib; {
            description = "A neoretro bitmap monospace font — 8×16 px cell, designed to carry the full Nerd Fonts glyphset";
            longDescription = ''
              Tessera Mono is a pixel-perfect bitmap monospace font designed for
              terminals, code editors, and design docs. Every glyph is hand-drawn
              on an 8×16 grid and rendered as filled paths at any integer scale.

              Features:
              - Basic Latin (95 printable glyphs) — complete
              - Latin diacritic composites (À-ÿ) — complete
              - Box drawing (U+2500–U+257F) — algorithmic
              - Block elements (U+2580–U+259F) — algorithmic
              - Math operators & arrows — curated set
              - Powerline separators (U+E0B0–E0B3)
              - IEC Power Symbols
              - Pomicons (Pomodoro tracking)
              - Devicons, Codicons, Octicons, Seti-UI icons
              - Font Awesome essentials (files, actions, status, symbols, hardware)
            '';
            homepage = "https://zexk.github.io/tessera-mono";
            license = licenses.ofl;
            platforms = platforms.all;
            maintainers = [ ];
          };
        };
      in
      {
        packages = {
          default = tessera-mono;   # scalable TTF
          otb = otbAll;             # 16/32/48 px strikes in one file (recommended)
          otb-1x = mkOtb 1;         # 8×16 px cell
          otb-2x = mkOtb 2;         # 16×32 px cell (1080p daily driver)
          otb-3x = mkOtb 3;         # 24×48 px cell (4k)
        };

        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs
            gbdfed          # bitmap font editor for glyph editing
            otf2bdf         # TTF → BDF converter for the edit pipeline
            fonttosfnt      # BDF → OTB bitmap strikes
            fd
            ripgrep
            nerd-fonts.symbols-only  # NF icon specimen for the web editor's reference pane
            (python3.withPackages (ps: with ps; [ freetype-py pillow fonttools ]))
          ];
          # edit-server.mjs serves the specimen from here (/api/nerdfont)
          NERD_FONT_DIR = "${pkgs.nerd-fonts.symbols-only}/share/fonts";
        };
      });
}
