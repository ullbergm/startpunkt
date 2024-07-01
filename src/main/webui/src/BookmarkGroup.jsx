import { Bookmark } from './Bookmark';

export function BookmarkGroup(props) {
  return (
    <div>
      <h2 class="pb-2 border-bottom text-uppercase">{props.group}</h2>

      <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4 py-5">
        {props.bookmarks.map && props.bookmarks.map((bookmark) => (
          <Bookmark bookmark={bookmark} />
        ))}
      </div>
    </div>
  )
}

export default BookmarkGroup;