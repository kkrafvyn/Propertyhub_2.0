import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_MARKETING_DOCUMENT, type MarketingPageDocument } from '../../../../lib/marketing-page-document';
const ContentContext = createContext<MarketingPageDocument>(DEFAULT_MARKETING_DOCUMENT);
export function MarketingContentProvider({ document, children }: { document: MarketingPageDocument; children: ReactNode }) { return <ContentContext.Provider value={document}>{children}</ContentContext.Provider>; }
export function useMarketingContent() { return useContext(ContentContext); }
