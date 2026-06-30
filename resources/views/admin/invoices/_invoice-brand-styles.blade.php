        .brand-block {
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
            flex: 1;
        }

        .brand-block--wide {
            flex-direction: column;
            align-items: flex-start;
            align-self: center;
            justify-content: center;
            gap: 3px;
            max-width: 58%;
            flex: 1 1 auto;
        }

        .brand-logo {
            width: auto;
            height: 14mm;
            max-width: 28mm;
            object-fit: contain;
            flex-shrink: 0;
        }

        .brand-logo--wide {
            max-width: 100%;
            width: auto;
            height: auto;
            max-height: 17mm;
            object-fit: contain;
            object-position: left center;
            display: block;
            margin: 0;
        }

        .brand-text {
            min-width: 0;
        }

        .brand-text--wide .brand-meta {
            margin-top: 0;
            line-height: 1.35;
        }

        .slip-header--wide-brand {
            align-items: center;
        }
