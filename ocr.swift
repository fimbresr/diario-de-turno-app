import Cocoa
import Vision
import Foundation

let args = CommandLine.arguments
if args.count < 2 {
    print("Usage: swift ocr.swift <image_path>")
    exit(1)
}

let imagePath = args[1]
print("Loading image: \(imagePath)")
fflush(stdout)

guard let image = NSImage(contentsOfFile: imagePath) else {
    print("Failed to load NSImage")
    exit(1)
}
guard let tiffData = image.tiffRepresentation else {
    print("Failed to get tiffData")
    exit(1)
}
guard let bitmap = NSBitmapImageRep(data: tiffData) else {
    print("Failed to get bitmap")
    exit(1)
}
guard let cgImage = bitmap.cgImage else {
    print("Failed to get cgImage")
    exit(1)
}

let requestHandler = VNImageRequestHandler(cgImage: cgImage, options: [:])
let request = VNRecognizeTextRequest { (request, error) in
    if let error = error {
        print("Error recognizing text: \(error)")
        return
    }
    
    guard let observations = request.results as? [VNRecognizedTextObservation] else {
        print("No observations found")
        return
    }
    
    for currentObservation in observations {
        let topCandidate = currentObservation.topCandidates(1)
        if let recognizedText = topCandidate.first {
            print(recognizedText.string)
        }
    }
}

request.recognitionLevel = .accurate
request.usesLanguageCorrection = false

do {
    try requestHandler.perform([request])
    print("Done")
} catch {
    print("Unable to perform the requests: \(error).")
}
