# Vendor SPICE model registry

This directory contains metadata only. Vendor macromodels are intentionally not committed because redistribution rights differ by vendor and product. The registry records the official source, simulator family, validation scope, and ingestion status.

## Ingestion procedure

1. Select an exact manufacturer part number from the project BOM.
2. Download the model from the manufacturer product page or official model portal.
3. Store the model in a private model volume or secret-file store, not in Git, unless the vendor license explicitly permits redistribution.
4. Record the source URL, download date, model revision, SHA-256, license text, simulator dialect, pin order, and supported operating conditions.
5. Run a syntax and convergence check in ngspice. PSpice models may require a reviewed compatibility conversion and must never be silently treated as equivalent.
6. Run a model-specific validation deck for DC operating point, load/transient behavior, current limit, dropout, enable/disable, and temperature corners where supported.
7. Attach the model provenance and known limitations to the project release artifact.

A vendor macromodel is not a substitute for datasheet limits, tolerance analysis, thermal characterization, bench correlation, or regulatory review. For example, the Renesas RAA214023 documentation states that its model uses typical room-temperature parameters and does not model thermal effects, process variation, part-to-part variation, or package differences. Those limitations must remain visible in the release record.

The initial registry covers official model sources from ROHM, Renesas, and Texas Instruments. See `registry.json` for the machine-readable catalog.
