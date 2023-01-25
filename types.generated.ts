// Code generated by prismic-ts-codegen. DO NOT EDIT.

import type * as prismicT from "@prismicio/types";
import type * as prismic from "@prismicio/client";

type Simplify<T> = {
    [KeyType in keyof T]: T[KeyType];
};
/** Content for weeknotes documents */
interface WeeknotesDocumentData {
    /**
     * title field in *weeknotes*
     *
     * - **Field Type**: Title
     * - **Placeholder**: The main title of the weeknote.
     * - **API ID Path**: weeknotes.title
     * - **Tab**: Main
     * - **Documentation**: https://prismic.io/docs/core-concepts/rich-text-title
     *
     */
    title: prismicT.TitleField;
    /**
     * body field in *weeknotes*
     *
     * - **Field Type**: Rich Text
     * - **Placeholder**: Main content area for the weeknote.
     * - **API ID Path**: weeknotes.body
     * - **Tab**: Main
     * - **Documentation**: https://prismic.io/docs/core-concepts/rich-text-title
     *
     */
    body: prismicT.RichTextField;
    /**
     * displayed published date field in *weeknotes*
     *
     * - **Field Type**: Timestamp
     * - **Placeholder**: The timestamp you want to use as the cheaty “published” date
     * - **API ID Path**: weeknotes.date
     * - **Tab**: Main
     * - **Documentation**: https://prismic.io/docs/core-concepts/timestamp
     *
     */
    date: prismicT.TimestampField;
}
/**
 * weeknotes document from Prismic
 *
 * - **API ID**: `weeknotes`
 * - **Repeatable**: `true`
 * - **Documentation**: https://prismic.io/docs/core-concepts/custom-types
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type WeeknotesDocument<Lang extends string = string> = prismicT.PrismicDocumentWithUID<Simplify<WeeknotesDocumentData>, "weeknotes", Lang>;
export type AllDocumentTypes = WeeknotesDocument;
declare module "@prismicio/client" {
    interface CreateClient {
        (repositoryNameOrEndpoint: string, options?: prismic.ClientConfig): prismic.Client<AllDocumentTypes>;
    }
    namespace Content {
        export type { WeeknotesDocumentData, WeeknotesDocument, AllDocumentTypes };
    }
}
