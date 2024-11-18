import { ApiProperty } from '@nestjs/swagger';

export class ImageResult {
  @ApiProperty()
  title: string;

  @ApiProperty()
  link: string;

  @ApiProperty()
  source: string;

  @ApiProperty()
  thumbnail: string;
}

export class SearchMetadata {
  @ApiProperty()
  status: string;

  @ApiProperty()
  id: string;
}

export class GoogleReverseImageSearchResponse {
  @ApiProperty()
  search_metadata: SearchMetadata;

  @ApiProperty({ type: [ImageResult] })
  image_results: ImageResult[];
}
